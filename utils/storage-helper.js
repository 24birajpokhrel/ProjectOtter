const StorageHelper = {
  /**
   * Retrieves settings from Chrome's local storage.
   * If no keys are provided, it returns all settings.
   */
  get: (keys = null) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result);
      });
    });
  },

  /**
   * Updates settings in storage and automatically notifies 
   * the active tab that a change occurred.
   */
  set: (newSettings) => {
    return new Promise((resolve) => {
      chrome.storage.local.set(newSettings, () => {
        // Broadcast the update so content scripts can react instantly
        chrome.runtime.sendMessage({
          action: "settingsUpdated",
          payload: newSettings
        });
        resolve();
      });
    });
  }
};