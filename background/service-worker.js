/**
 * ProjectOtter — background/service-worker.js
 *
 * Manifest V3 service workers are EPHEMERAL — they spin up, do work,
 * and terminate. Never store live state here. All persistent state
 * lives in chrome.storage.local.
 *
 * Responsibilities:
 *   1. Set storage schema defaults on first install
 *   2. Handle any background-level events (context menus, shortcuts, etc.)
 */

// ─── Install: seed storage schema ────────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      chrome.storage.local.set({
        // Focus Ruler defaults
        focusRulerEnabled : false,
        rulerHeight       : 40,     // px — comfortable single line
        dimOpacity        : 0.75,   // 0.0–1.0
  
        // Future feature defaults (set now so content scripts never get undefined)
        typographyEngineEnabled : false,
        visualFiltersEnabled    : false,
      });
  
      console.log('[ProjectOtter] Storage schema initialized with defaults.');
    }
  
    if (details.reason === 'update') {
      // On extension update, only set keys that don't already exist
      // (preserves user settings across updates)
      chrome.storage.local.get(null, (existing) => {
        const defaults = {
          focusRulerEnabled       : false,
          rulerHeight             : 40,
          dimOpacity              : 0.75,
          typographyEngineEnabled : false,
          visualFiltersEnabled    : false,
        };
  
        const missing = {};
        for (const [key, value] of Object.entries(defaults)) {
          if (!(key in existing)) missing[key] = value;
        }
  
        if (Object.keys(missing).length > 0) {
          chrome.storage.local.set(missing);
          console.log('[ProjectOtter] Added new storage keys:', missing);
        }
      });
    }
  });
  
  // ─── Keyboard shortcut handler (future) ──────────────────────────────────────
  chrome.commands?.onCommand.addListener((command) => {
    if (command === 'toggle-focus-ruler') {
      chrome.storage.local.get(['focusRulerEnabled'], (result) => {
        const next = !result.focusRulerEnabled;
        chrome.storage.local.set({ focusRulerEnabled: next });
  
        // Relay to active tab's content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]?.id) return;
          chrome.tabs.sendMessage(tabs[0].id, {
            type    : 'FOCUS_RULER_TOGGLE',
            enabled : next,
          }).catch(() => {}); // Silently fail on restricted pages
        });
      });
    }
  });