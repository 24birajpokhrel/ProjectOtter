/**
 * AccessiLens — content-scripts/typography-engine.js
 * STUB — Feature not yet implemented.
 *
 * Planned features:
 *   - OpenDyslexic font injection (overrides all font-family declarations)
 *   - Text scaling slider (adjusts font-size globally)
 *   - Bionic Reading (bolds first letters of every word)
 *   - Letter/word/line spacing adjustments
 *
 * Architecture when built:
 *   - Same IIFE + guard + init() + registerMessageListener() pattern as focus-ruler.js
 *   - Storage keys: typographyEngineEnabled, bionicEnabled (already seeded in service-worker.js)
 *   - Message types to implement:
 *       TYPOGRAPHY_TOGGLE   { enabled }
 *       BIONIC_TOGGLE       { enabled }
 *
 * Depends on: utils/storage-helper.js (loaded before this in manifest.json)
 */

;(() => {
    'use strict';
  
    if (window.__alTypographyLoaded) return;
    window.__alTypographyLoaded = true;
  
    // Stub message listener — registers so future messages don't throw
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case 'TYPOGRAPHY_TOGGLE':
        case 'BIONIC_TOGGLE':
          // TODO: implement
          sendResponse({ ok: false, reason: 'not implemented' });
          break;
        default:
          break;
      }
      return true;
    });
  
    console.debug('[AccessiLens] typography-engine stub loaded.');
  })();