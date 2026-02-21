// content.js – AccessiLens Content Script
// Injects and manages all visual accessibility layers into any webpage

(function () {
  'use strict';

  // ─── IDs ────────────────────────────────────────────────────────────────────
  const IDS = {
    OVERLAY: 'accessilens-overlay',
    SVG_FILTER: 'accessilens-svg-filters',
    DARK_STYLE: 'accessilens-dark-mode',
    ROOT_CLASS_DARK: 'accessilens-dark',
    ROOT_CLASS_CB: 'accessilens-cb'
  };

  // ─── SVG Color Matrix Filters for Colorblindness ────────────────────────────
  // Matrices derived from established color vision deficiency simulation research
  const CB_FILTERS = {
    protanopia: `
      <filter id="cb-protanopia">
        <feColorMatrix type="matrix" values="
          0.567, 0.433, 0,     0, 0
          0.558, 0.442, 0,     0, 0
          0,     0.242, 0.758, 0, 0
          0,     0,     0,     1, 0"/>
      </filter>`,
    deuteranopia: `
      <filter id="cb-deuteranopia">
        <feColorMatrix type="matrix" values="
          0.625, 0.375, 0,   0, 0
          0.7,   0.3,   0,   0, 0
          0,     0.3,   0.7, 0, 0
          0,     0,     0,   1, 0"/>
      </filter>`,
    tritanopia: `
      <filter id="cb-tritanopia">
        <feColorMatrix type="matrix" values="
          0.95, 0.05,  0,     0, 0
          0,    0.433, 0.567, 0, 0
          0,    0.475, 0.525, 0, 0
          0,    0,     0,     1, 0"/>
      </filter>`
  };

  // ─── Dark Mode CSS ───────────────────────────────────────────────────────────
  const DARK_MODE_CSS = `
    html.accessilens-dark,
    html.accessilens-dark body {
      background-color: #121212 !important;
      color: #e8e8e8 !important;
    }
    html.accessilens-dark * {
      background-color: inherit;
      border-color: #333 !important;
    }
    html.accessilens-dark a { color: #7ab8f5 !important; }
    html.accessilens-dark img,
    html.accessilens-dark video { filter: brightness(0.85) !important; }
    html.accessilens-dark input,
    html.accessilens-dark textarea,
    html.accessilens-dark select {
      background-color: #1e1e1e !important;
      color: #e8e8e8 !important;
      border: 1px solid #444 !important;
    }
    html.accessilens-dark button {
      background-color: #2a2a2a !important;
      color: #e8e8e8 !important;
      border: 1px solid #555 !important;
    }
    html.accessilens-dark h1, html.accessilens-dark h2,
    html.accessilens-dark h3, html.accessilens-dark h4,
    html.accessilens-dark h5, html.accessilens-dark h6 {
      color: #f0f0f0 !important;
    }
    html.accessilens-dark p, html.accessilens-dark span,
    html.accessilens-dark li, html.accessilens-dark td,
    html.accessilens-dark th, html.accessilens-dark label {
      color: #d8d8d8 !important;
    }
  `;

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  // ─── Feature: Color Overlay ──────────────────────────────────────────────────
  function applyOverlay(state) {
    let overlay = document.getElementById(IDS.OVERLAY);

    if (!state.overlay.enabled) {
      if (overlay) overlay.remove();
      return;
    }

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = IDS.OVERLAY;
      document.body.appendChild(overlay);
    }

    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: 2147483646 !important;
      background-color: ${hexToRgba(state.overlay.color, state.overlay.opacity)} !important;
      mix-blend-mode: multiply !important;
      transition: background-color 0.3s ease !important;
    `;
  }

  // ─── Feature: Dark Mode ──────────────────────────────────────────────────────
  function applyDarkMode(state) {
    let styleEl = document.getElementById(IDS.DARK_STYLE);

    if (state.darkMode.enabled) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = IDS.DARK_STYLE;
        styleEl.textContent = DARK_MODE_CSS;
        document.head.appendChild(styleEl);
      }
      document.documentElement.classList.add(IDS.ROOT_CLASS_DARK);
    } else {
      if (styleEl) styleEl.remove();
      document.documentElement.classList.remove(IDS.ROOT_CLASS_DARK);
    }
  }

  // ─── Feature: Colorblindness SVG Filter ─────────────────────────────────────
  function applyColorblindFilter(state) {
    // Remove previous SVG filter element
    const existing = document.getElementById(IDS.SVG_FILTER);
    if (existing) existing.remove();

    // Remove any existing body filter
    document.documentElement.style.removeProperty('filter');

    if (!state.colorblind.enabled || state.colorblind.mode === 'none') {
      return;
    }

    const mode = state.colorblind.mode;
    const filterDef = CB_FILTERS[mode];
    if (!filterDef) return;

    // Inject hidden SVG with filter definition
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.id = IDS.SVG_FILTER;
    svg.setAttribute('xmlns', svgNS);
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    svg.innerHTML = `<defs>${filterDef}</defs>`;
    document.body.insertBefore(svg, document.body.firstChild);

    // Apply CSS filter referencing the SVG filter
    document.documentElement.style.setProperty('filter', `url(#cb-${mode})`, 'important');
  }

  // ─── Apply Full State ────────────────────────────────────────────────────────
  function applyState(state) {
    if (!state) return;
    applyOverlay(state);
    applyDarkMode(state);
    applyColorblindFilter(state);
  }

  // ─── Listen for messages from background ────────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'APPLY_STATE') {
      applyState(message.state);
    }
  });

  // ─── On load: restore persisted state ────────────────────────────────────────
  chrome.storage.sync.get('accessiLensState', (data) => {
    if (data.accessiLensState) {
      applyState(data.accessiLensState);
    }
  });

})();
