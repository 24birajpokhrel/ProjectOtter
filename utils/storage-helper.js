/**
 * ProjectOtter — utils/storage-helper.js
 *
 * Single source of truth for all chrome.storage.local keys.
 * Every content script and popup imports from here — no magic strings elsewhere.
 *
 * NOTE: Content scripts cannot use ES module `import` natively in MV3 without
 * a bundler. Until esbuild is configured, this file is loaded as a second
 * content_scripts entry in manifest.json (before focus-ruler.js) so that
 * `window.StorageHelper` and `window.STORAGE_KEYS` are available globally.
 */

const STORAGE_KEYS = {
    // Focus Ruler
    RULER_ENABLED  : 'focusRulerEnabled',
    RULER_HEIGHT   : 'rulerHeight',
    DIM_OPACITY    : 'dimOpacity',
  
    // Typography Engine (future)
    TYPO_ENABLED   : 'typographyEngineEnabled',
  
    // Visual Filters (future)
    FILTER_ENABLED : 'visualFiltersEnabled',
  };
  
  const StorageHelper = {
    /**
     * Get one or more keys from storage.
     * @param {string|string[]} keys
     * @returns {Promise<object>}
     */
    get(keys) {
      return chrome.storage.local.get(keys);
    },
  
    /**
     * Set one or more key/value pairs.
     * @param {object} items
     * @returns {Promise<void>}
     */
    set(items) {
      return chrome.storage.local.set(items);
    },
  
    /**
     * Get all known ProjectOtter keys in one call.
     * @returns {Promise<object>}
     */
    getAll() {
      return chrome.storage.local.get(Object.values(STORAGE_KEYS));
    },
  
    /**
     * Convenience: get just the Focus Ruler settings.
     * @returns {Promise<{focusRulerEnabled, rulerHeight, dimOpacity}>}
     */
    getRulerSettings() {
      return chrome.storage.local.get([
        STORAGE_KEYS.RULER_ENABLED,
        STORAGE_KEYS.RULER_HEIGHT,
        STORAGE_KEYS.DIM_OPACITY,
      ]);
    },
  };
  
  // Expose globally for non-module content script usage (pre-bundler)
  if (typeof window !== 'undefined') {
    window.STORAGE_KEYS  = STORAGE_KEYS;
    window.StorageHelper = StorageHelper;
  }
  
  // Also support module imports (post-bundler / popup usage)
  if (typeof module !== 'undefined') {
    module.exports = { STORAGE_KEYS, StorageHelper };
  }