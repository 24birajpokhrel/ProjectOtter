// background.js – AccessiLens Service Worker (MV3)
// Manages state persistence and tab communication

const DEFAULT_STATE = {
  overlay: {
    enabled: false,
    color: '#ffff00',
    opacity: 0.15
  },
  darkMode: {
    enabled: false
  },
  colorblind: {
    enabled: false,
    mode: 'none' // 'protanopia' | 'deuteranopia' | 'tritanopia' | 'none'
  }
};

// On install, set defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ accessiLensState: DEFAULT_STATE });
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    chrome.storage.sync.get('accessiLensState', (data) => {
      sendResponse(data.accessiLensState || DEFAULT_STATE);
    });
    return true; // async
  }

  if (message.type === 'SET_STATE') {
    chrome.storage.sync.set({ accessiLensState: message.state }, () => {
      // Broadcast to the active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'APPLY_STATE',
            state: message.state
          }).catch(() => {
            // Content script may not be ready – inject it
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['content.js']
            });
          });
        }
      });
      sendResponse({ success: true });
    });
    return true;
  }
});

// Apply saved state when a tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.sync.get('accessiLensState', (data) => {
      const state = data.accessiLensState || DEFAULT_STATE;
      const isActive = state.overlay.enabled || state.darkMode.enabled || state.colorblind.enabled;
      if (isActive) {
        chrome.tabs.sendMessage(tabId, { type: 'APPLY_STATE', state }).catch(() => {});
      }
    });
  }
});
