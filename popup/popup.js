/**
 * ProjectOtter — popup/popup.js
 *
 * Popup lifecycle:
 *   1. On open  → read chrome.storage.local, hydrate all UI controls
 *   2. On change → write to storage, send message to active tab content script
 *
 * The popup is DESTROYED and RECREATED every time it opens and closes.
 * It has no persistent memory. All state lives in chrome.storage.local.
 */

;(async () => {
    'use strict';
  
    // ─── DOM refs ─────────────────────────────────────────────────────────────
    const rulerToggle   = document.getElementById('rulerToggle');
    const heightRange   = document.getElementById('heightRange');
    const heightOutput  = document.getElementById('heightOutput');
    const opacityRange  = document.getElementById('opacityRange');
    const opacityOutput = document.getElementById('opacityOutput');
    const statusDot     = document.getElementById('statusDot');
    const statusText    = document.getElementById('statusText');
    const footerPage    = document.getElementById('footerPage');
  
    // ─── Storage keys (mirrors STORAGE_KEYS in utils/storage-helper.js) ───────
    const KEYS = {
      RULER_ENABLED : 'focusRulerEnabled',
      RULER_HEIGHT  : 'rulerHeight',
      DIM_OPACITY   : 'dimOpacity',
    };
  
    // ─── 1. Hydrate UI from storage on popup open ─────────────────────────────
    try {
      const stored = await chrome.storage.local.get(Object.values(KEYS));
  
      const enabled = stored[KEYS.RULER_ENABLED] ?? false;
      const height  = stored[KEYS.RULER_HEIGHT]  ?? 40;
      const opacity = stored[KEYS.DIM_OPACITY]   ?? 0.75;
  
      rulerToggle.checked    = enabled;
      heightRange.value      = height;
      opacityRange.value     = Math.round(opacity * 100);
  
      syncOutputLabels(height, Math.round(opacity * 100));
      syncStatusUI(enabled);
  
    } catch (err) {
      console.warn('[ProjectOtter Popup] Storage read failed:', err);
    }
  
    // ─── Show current tab's hostname in footer ─────────────────────────────────
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        footerPage.textContent = url.hostname;
        footerPage.title       = url.href;
      }
    } catch (_) {
      footerPage.textContent = '';
    }
  
    // ─── 2. Event listeners ───────────────────────────────────────────────────
  
    // Toggle ruler ON / OFF
    rulerToggle.addEventListener('change', async () => {
      const enabled = rulerToggle.checked;
  
      await chrome.storage.local.set({ [KEYS.RULER_ENABLED]: enabled });
      syncStatusUI(enabled);
  
      sendToTab({
        type    : 'FOCUS_RULER_TOGGLE',
        enabled : enabled,
        // Also send current settings so content script can apply them on enable
        settings: {
          height  : parseInt(heightRange.value, 10),
          opacity : parseInt(opacityRange.value, 10) / 100,
        },
      });
    });
  
    // Height slider
    heightRange.addEventListener('input', () => {
      const height = parseInt(heightRange.value, 10);
      heightOutput.textContent = `${height} px`;
      chrome.storage.local.set({ [KEYS.RULER_HEIGHT]: height });
      sendToTab({ type: 'FOCUS_RULER_UPDATE_SETTINGS', settings: { height } });
    });
  
    // Opacity slider
    opacityRange.addEventListener('input', () => {
      const pct     = parseInt(opacityRange.value, 10);
      const opacity = pct / 100;
      opacityOutput.textContent = `${pct}%`;
      chrome.storage.local.set({ [KEYS.DIM_OPACITY]: opacity });
      sendToTab({ type: 'FOCUS_RULER_UPDATE_SETTINGS', settings: { opacity } });
    });
  
    // ─── Helpers ──────────────────────────────────────────────────────────────
  
    function syncOutputLabels(height, opacityPct) {
      heightOutput.textContent  = `${height} px`;
      opacityOutput.textContent = `${opacityPct}%`;
    }
  
    function syncStatusUI(enabled) {
      statusText.textContent = enabled ? 'Ruler active' : 'Ruler off';
      statusDot.classList.toggle('footer__dot--active', enabled);
    }
  
    async function sendToTab(message) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (_) {
        // Silently fail on restricted pages (chrome://, chrome web store, etc.)
        // The storage write still happens so state is correct on next page load.
      }
    }
  
  })();