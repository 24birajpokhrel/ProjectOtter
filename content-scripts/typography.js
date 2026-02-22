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

// Dyslexia Font

function applyFont(dyslexiaState) {
    const existingStyle = document.getElementById('dyslexia-font-override');
    if (existingStyle) {
        existingStyle.remove();
    }

    if (!dyslexiaState || !dyslexiaState.enabled || dyslexiaState.font === 'default') {
        return;
    }

    const style = document.createElement('style');
    style.id = 'dyslexia-font-override';
    let fontFaceCSS = '';

    if (dyslexiaState.font === 'OpenDyslexic') {
        // Ensure this points exactly to your font file!
        const fontUrl = chrome.runtime.getURL('assets/icons/fonts/OpenDyslexic3-Regular.ttf');
        fontFaceCSS = `
            @font-face {
                font-family: 'OpenDyslexic';
                src: url('${fontUrl}') format('truetype');
                font-weight: normal;
                font-style: normal;
            }
        `; 
    }

    style.textContent = `
        ${fontFaceCSS}
        * {
            font-family: '${dyslexiaState.font}', sans-serif !important;
            font-weight: 500 !important;
            letter-spacing: 0.03em !important;
            line-height: 1.6 !important;
        }
    `;
    
    if (document.head || document.documentElement) {
        (document.head || document.documentElement).appendChild(style);
    }
}

// 1. Check persistent memory immediately when a new tab opens
chrome.storage.local.get(['dyslexiaFontEnabled', 'dyslexiaFontFamily'], (data) => {
    if (data.dyslexiaFontEnabled) {
        applyFont({ 
            enabled: data.dyslexiaFontEnabled, 
            font: data.dyslexiaFontFamily || 'OpenDyslexic' 
        });
    }
});

// 2. Listen for the live Megaphone broadcast from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SET_STATE' && request.state && request.state.dyslexia) {
        applyFont(request.state.dyslexia);
    }
});