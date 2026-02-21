chrome.runtime.onInstalled.addListener(() => {
  const defaultSettings = {
    dyslexiaFontEnabled: false,
    textScale: 100,
    colorOverlayEnabled: false,
    overlayColor: "rgba(255, 255, 0, 0.2)",
    focusRulerEnabled: false,
    bionicReadingEnabled: false,
    darkModeEnabled: false
  };

  chrome.storage.local.set(defaultSettings, () => {
    console.log("Project Otter initialized with default settings.");
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "settingsUpdated") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, request.payload);
      }
    });
    sendResponse({ status: "Settings broadcasted to active tab." });
  }
  return true; 
});