/**
 * ProjectOtter — content-scripts/focus-ruler.js
 *
 * The Focus Ruler engine. Injected into every webpage via manifest.json.
 * Creates a Shadow DOM reading mask that dims the page except for a
 * horizontal strip following the user's cursor.
 *
 * Architecture:
 *   - Shadow DOM (mode: 'closed') for full CSS isolation
 *   - Single-element CSS gradient masking (no stacked divs)
 *   - requestAnimationFrame loop decoupled from mousemove events
 *   - CSS custom properties as the sole JS→CSS interface
 *   - chrome.storage.local for persistent state
 *   - chrome.runtime.onMessage for live popup → content script control
 *
 * Depends on: utils/storage-helper.js (loaded before this in manifest.json)
 * The globals window.STORAGE_KEYS and window.StorageHelper are available.
 */

;(() => {
    'use strict';
  
    // ─── Guard: prevent double-injection ─────────────────────────────────────
    // Can happen if the script is injected programmatically AND via manifest.json
    if (window.__projectOtterRulerLoaded) return;
    window.__projectOtterRulerLoaded = true;
  
    // ─── Local references to globals set by storage-helper.js ────────────────
    // Fallback strings guard against storage-helper not loading in time
    const KEYS = window.STORAGE_KEYS || {
      RULER_ENABLED : 'focusRulerEnabled',
      RULER_HEIGHT  : 'rulerHeight',
      DIM_OPACITY   : 'dimOpacity',
    };
  
    // ─── Constants ────────────────────────────────────────────────────────────
    const SHADOW_HOST_ID    = '__otter-ruler-host__';
    const OVERLAY_CLASS     = 'ruler-overlay';
    const DEFAULT_HEIGHT    = 40;    // px
    const DEFAULT_OPACITY   = 0.75;  // 0.0 – 1.0
    const DEFAULT_Y         = window.innerHeight / 2;
  
    // ─── Module state ─────────────────────────────────────────────────────────
    let shadowHost = null;
    let shadowRoot = null;
    let overlay    = null;
    let isEnabled  = false;
    let rafId      = null;
    let pendingY   = null;  // Written by mousemove, read by rAF — never null after first move
    let currentY   = DEFAULT_Y;
  
    // ─── Bootstrap: check storage then register message listener ─────────────
    init();
  
    async function init() {
      try {
        const result = await chrome.storage.local.get([
          KEYS.RULER_ENABLED,
          KEYS.RULER_HEIGHT,
          KEYS.DIM_OPACITY,
        ]);
  
        if (result[KEYS.RULER_ENABLED] === true) {
          enable({
            height  : result[KEYS.RULER_HEIGHT]  ?? DEFAULT_HEIGHT,
            opacity : result[KEYS.DIM_OPACITY]   ?? DEFAULT_OPACITY,
          });
        }
      } catch (err) {
        // Storage read fails on some restricted pages — fail silently
        console.debug('[ProjectOtter] Storage read failed:', err.message);
      }
  
      // Message listener MUST be registered regardless of enabled state.
      // If registered only inside enable(), there is no way to receive
      // the "turn on" message on pages where the ruler started disabled.
      registerMessageListener();
    }
  
    // ─── Enable ───────────────────────────────────────────────────────────────
    function enable(settings = {}) {
      if (isEnabled) {
        // Already enabled — just update settings if provided
        applySettings(settings);
        return;
      }
  
      isEnabled = true;
      createOverlay(settings);
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('resize',    onResize,    { passive: true });
      startRaf();
  
      console.debug('[ProjectOtter] Focus Ruler enabled.');
    }
  
    // ─── Disable ──────────────────────────────────────────────────────────────
    function disable() {
      if (!isEnabled) return;
  
      isEnabled = false;
      stopRaf();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize',    onResize);
      destroyOverlay();
  
      console.debug('[ProjectOtter] Focus Ruler disabled.');
    }
  
    // ─── Shadow DOM + Overlay Creation ───────────────────────────────────────
    function createOverlay({ height = DEFAULT_HEIGHT, opacity = DEFAULT_OPACITY } = {}) {
      // Prevent duplicate hosts (defensive guard)
      document.getElementById(SHADOW_HOST_ID)?.remove();
  
      // ── Shadow host ──
      // The host itself has zero dimensions and no visual presence.
      // It exists only to hold the Shadow DOM.
      shadowHost = document.createElement('div');
      shadowHost.id = SHADOW_HOST_ID;
  
      Object.assign(shadowHost.style, {
        // Reset everything that could be inherited or set by host page
        all           : 'initial',
        position      : 'fixed',
        inset         : '0',
        width         : '0',
        height        : '0',
        overflow      : 'visible',
        zIndex        : '2147483647',
        pointerEvents : 'none',
        display       : 'block',
      });
  
      // ── Shadow root (closed — host page JS cannot query inside) ──
      shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
  
      // ── Inject styles ──
      // Styles are loaded from ruler-shadow.css content (inlined via fetch or
      // embedded string). Pre-bundler approach: embed directly.
      const styleEl = document.createElement('style');
      styleEl.textContent = getRulerCSS();
      shadowRoot.appendChild(styleEl);
  
      // ── Overlay element ──
      overlay = document.createElement('div');
      overlay.className = OVERLAY_CLASS;
      shadowRoot.appendChild(overlay);
  
      // ── Initialise CSS variables ──
      setVar('--ruler-y',      `${currentY}px`);
      setVar('--ruler-height', `${height}px`);
      setVar('--dim-opacity',  `${opacity}`);
      setVar('--vw',           `${window.innerWidth}px`);
      setVar('--vh',           `${window.innerHeight}px`);
  
      // ── Mount to page ──
      // Append to documentElement (not body) — body may not exist on all pages,
      // and documentElement is always present.
      (document.body || document.documentElement).appendChild(shadowHost);
    }
  
    function destroyOverlay() {
      shadowHost?.remove();
      shadowHost = null;
      shadowRoot = null;
      overlay    = null;
    }
  
    // ─── CSS Variable helpers ─────────────────────────────────────────────────
    function setVar(name, value) {
      overlay?.style.setProperty(name, value);
    }
  
    function applySettings({ height, opacity } = {}) {
      if (height  !== undefined) setVar('--ruler-height', `${height}px`);
      if (opacity !== undefined) setVar('--dim-opacity',  `${opacity}`);
    }
  
    // ─── requestAnimationFrame loop ───────────────────────────────────────────
    //
    // CRITICAL PERFORMANCE PATTERN:
    //   mousemove fires at the mouse's hardware polling rate (up to 1000hz).
    //   requestAnimationFrame fires at the display's refresh rate (60–120hz).
    //
    //   By writing ONLY to `pendingY` in mousemove and reading ONCE per rAF
    //   frame, DOM updates are capped at display refresh rate regardless of
    //   mouse speed. This prevents layout thrashing and dropped frames.
    //
    function startRaf() {
      function loop() {
        if (!isEnabled) return; // Stop loop cleanly if disabled mid-frame
  
        if (pendingY !== null) {
          currentY = pendingY;
          pendingY = null;
          setVar('--ruler-y', `${currentY}px`);
        }
  
        rafId = requestAnimationFrame(loop);
      }
  
      rafId = requestAnimationFrame(loop);
    }
  
    function stopRaf() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  
    // ─── Event handlers ───────────────────────────────────────────────────────
    function onMouseMove(e) {
      pendingY = e.clientY; // Write only — rAF loop handles the DOM update
    }
  
    function onResize() {
      setVar('--vw', `${window.innerWidth}px`);
      setVar('--vh', `${window.innerHeight}px`);
    }
  
    // ─── Message listener ─────────────────────────────────────────────────────
    function registerMessageListener() {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  
        switch (message.type) {
  
          case 'FOCUS_RULER_TOGGLE':
            if (message.enabled) {
              enable({
                height  : message.settings?.height,
                opacity : message.settings?.opacity,
              });
            } else {
              disable();
            }
            sendResponse({ ok: true, enabled: message.enabled });
            break;
  
          case 'FOCUS_RULER_UPDATE_SETTINGS':
            applySettings(message.settings || {});
            sendResponse({ ok: true });
            break;
  
          case 'FOCUS_RULER_GET_STATE':
            // Allows popup to query current state on open
            sendResponse({
              ok      : true,
              enabled : isEnabled,
              y       : currentY,
            });
            break;
  
          default:
            // Ignore messages intended for other features
            break;
        }
  
        // Return true to keep the message channel open for async responses
        return true;
      });
    }
  
    // ─── Inlined Shadow DOM CSS ───────────────────────────────────────────────
    //
    // Pre-bundler approach: CSS is embedded as a string here.
    // Post-bundler: this function is replaced by an import of ruler-shadow.css
    // via esbuild's `--loader:.css=text` flag.
    //
    // The content of this string MUST stay in sync with styles/ruler-shadow.css.
    //
    function getRulerCSS() {
      return /* css */ `
        :host {
          all            : initial;
          display        : block;
          position       : fixed;
          inset          : 0;
          width          : 0;
          height         : 0;
          pointer-events : none;
          z-index        : 2147483647;
        }
  
        .ruler-overlay {
          position       : fixed;
          inset          : 0;
          width          : var(--vw, 100vw);
          height         : var(--vh, 100vh);
          pointer-events : none;
          will-change    : background;
  
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, var(--dim-opacity, 0.75)) 0px,
            rgba(0, 0, 0, var(--dim-opacity, 0.75))
              calc(var(--ruler-y, 50vh) - var(--ruler-height, 40px) / 2),
  
            transparent
              calc(var(--ruler-y, 50vh) - var(--ruler-height, 40px) / 2),
            transparent
              calc(var(--ruler-y, 50vh) + var(--ruler-height, 40px) / 2),
  
            rgba(0, 0, 0, var(--dim-opacity, 0.75))
              calc(var(--ruler-y, 50vh) + var(--ruler-height, 40px) / 2),
            rgba(0, 0, 0, var(--dim-opacity, 0.75)) 100%
          );
        }
  
        .ruler-overlay::before,
        .ruler-overlay::after {
          content        : '';
          position       : absolute;
          left           : 0;
          width          : 100%;
          height         : 1px;
          pointer-events : none;
          background     : rgba(245, 200, 66, 0.5);
          box-shadow     : 0 0 6px 1px rgba(245, 200, 66, 0.2);
        }
  
        .ruler-overlay::before {
          top : calc(var(--ruler-y, 50vh) - var(--ruler-height, 40px) / 2);
        }
  
        .ruler-overlay::after {
          top : calc(var(--ruler-y, 50vh) + var(--ruler-height, 40px) / 2);
        }
  
        @media (prefers-reduced-motion: reduce) {
          .ruler-overlay::before,
          .ruler-overlay::after { box-shadow: none; }
        }
      `;
    }
  
  })();