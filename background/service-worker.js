/**
 * Project Otter — background/service-worker.js
 *
 * MV3 service workers are ephemeral — never store live state here.
 * All persistent state lives in chrome.storage.local.
 *
 * Merged from:
 *   - AccessiLens service-worker.js (tabs.onUpdated, update migration, commands)
 *   - ProjectOtter-main service-worker.js (dyslexia/typography/bionic key names)
 */

// ─── Complete default schema ───────────────────────────────────────────────────
// Every key that any content script may read must be seeded here.
const DEFAULTS = {
    // Focus Ruler
    focusRulerEnabled       : false,
    rulerHeight             : 40,
    dimOpacity              : 0.75,
  
    // Color Overlay
    overlayEnabled          : false,
    overlayColor            : '#ffff99',
    overlayOpacity          : 0.15,
  
    // Dark Mode
    darkModeEnabled         : false,
  
    // CVD Filter
    cvdEnabled              : false,
    cvdMode                 : 'none',
  
    // Dyslexia (teammate zone — key names from main branch)
    dyslexiaFontEnabled     : false,
    textScale               : 100,       // percent, range 50–200
  
    // Bionic Reading (teammate zone — key name from main branch)
    bionicReadingEnabled    : false,
  
    // Typography engine master toggle
    typographyEngineEnabled : false,
  };
  
  // ─── Install: seed all defaults ───────────────────────────────────────────────
  chrome.runtime.onInstalled.addListener((details) => {
  
    if (details.reason === 'install') {
      chrome.storage.local.set(DEFAULTS);
      console.log('[ProjectOtter] Storage initialized with defaults.');
    }
  
    if (details.reason === 'update') {
      // Only write keys that don't already exist — preserves user settings
      chrome.storage.local.get(null, (existing) => {
        const missing = {};
        for (const [key, value] of Object.entries(DEFAULTS)) {
          if (!(key in existing)) missing[key] = value;
        }
        if (Object.keys(missing).length > 0) {
          chrome.storage.local.set(missing);
          console.log('[ProjectOtter] Added new storage keys:', Object.keys(missing));
        }
      });
    }
  });
  
  // ─── Keyboard shortcut commands ───────────────────────────────────────────────
  chrome.commands?.onCommand.addListener((command) => {
  
    if (command === 'toggle-focus-ruler') {
      chrome.storage.local.get(['focusRulerEnabled'], (result) => {
        const next = !result.focusRulerEnabled;
        chrome.storage.local.set({ focusRulerEnabled: next });
        broadcastToActiveTab({ type: 'FOCUS_RULER_TOGGLE', enabled: next });
      });
    }
  
    if (command === 'toggle-color-overlay') {
      chrome.storage.local.get(['overlayEnabled'], (result) => {
        const next = !result.overlayEnabled;
        chrome.storage.local.set({ overlayEnabled: next });
        broadcastToActiveTab({ type: 'COLOR_OVERLAY_TOGGLE', enabled: next });
      });
    }
  
  });
  
  // ─── Tab navigation guard ─────────────────────────────────────────────────────
  // Re-applies active features when a tab finishes loading.
  // Without this, features disappear on every link click.
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status !== 'complete') return;
  
    chrome.storage.local.get(Object.keys(DEFAULTS), (stored) => {
      const anyActive =
        stored.focusRulerEnabled  ||
        stored.overlayEnabled     ||
        stored.darkModeEnabled    ||
        stored.cvdEnabled         ||
        stored.dyslexiaFontEnabled||
        stored.bionicReadingEnabled;
  
      if (!anyActive) return;
  
      chrome.tabs.sendMessage(tabId, {
        type  : 'REAPPLY_STATE',
        state : stored,
      }).catch(() => {}); // Silently fail on restricted pages
    });
  });
  
  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function broadcastToActiveTab(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return;
      chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {});
    });
  }