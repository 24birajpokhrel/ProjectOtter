/**
 * Project Otter — popup/popup.js
 *
 * Merged popup controller.
 *
 * UI structure from ProjectOtter-main:
 *   Three accordion sections (ADHD, Dyslexia, Color Blindness).
 *   Clicking a header opens/closes that section.
 *
 * Feature logic from AccessiLens:
 *   All toggles write to chrome.storage.local and send direct messages
 *   to the active tab content scripts (2-hop, no background relay).
 *
 * Teammate zones:
 *   dyslexiaFontToggle and textScaleRange are wired to storage.
 *   Teammates add their content script logic in typography-engine.js.
 *   The IDs and storage keys are set — teammates just need the engine side.
 */

'use strict';

// ─── Storage key strings (MUST match utils/storage-helper.js) ─────────────────
const KEYS = {
  // Focus Ruler
  RULER_ENABLED   : 'focusRulerEnabled',
  RULER_HEIGHT    : 'rulerHeight',
  DIM_OPACITY     : 'dimOpacity',
  // Color Overlay
  OVERLAY_ENABLED : 'overlayEnabled',
  OVERLAY_COLOR   : 'overlayColor',
  OVERLAY_OPACITY : 'overlayOpacity',
  // Dark Mode
  DARK_MODE       : 'darkModeEnabled',
  // CVD Filter
  CVD_ENABLED     : 'cvdEnabled',
  CVD_MODE        : 'cvdMode',
  // Dyslexia (teammate zone)
  DYSLEXIA_FONT   : 'dyslexiaFontEnabled',
  TEXT_SCALE      : 'textScale',
  BIONIC          : 'bionicReadingEnabled',
};

const DEFAULTS = {
  [KEYS.RULER_ENABLED]   : false,
  [KEYS.RULER_HEIGHT]    : 40,
  [KEYS.DIM_OPACITY]     : 0.75,
  [KEYS.OVERLAY_ENABLED] : false,
  [KEYS.OVERLAY_COLOR]   : '#ffff99',
  [KEYS.OVERLAY_OPACITY] : 0.15,
  [KEYS.DARK_MODE]       : false,
  [KEYS.CVD_ENABLED]     : false,
  [KEYS.CVD_MODE]        : 'none',
  [KEYS.DYSLEXIA_FONT]   : false,
  [KEYS.TEXT_SCALE]      : 100,
  [KEYS.BIONIC]          : false,
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────

// Accordion sections
const accordionItems = document.querySelectorAll('.accordion-item');

// Focus Ruler
const rulerToggle   = document.getElementById('rulerToggle');
const heightRange   = document.getElementById('heightRange');
const heightOutput  = document.getElementById('heightOutput');
const opacityRange  = document.getElementById('opacityRange');
const opacityOutput = document.getElementById('opacityOutput');
const bodyRuler     = document.getElementById('body-ruler');
const cardRuler     = document.getElementById('card-ruler');

// Color Overlay
const overlayToggle      = document.getElementById('overlayToggle');
const swatches           = document.querySelectorAll('#swatchGrid .swatch:not(.swatch--custom)');
const customColor        = document.getElementById('customColor');
const overlayOpRange     = document.getElementById('overlayOpacityRange');
const overlayOpOutput    = document.getElementById('overlayOpacityOutput');
const bodyOverlay        = document.getElementById('body-overlay');
const cardOverlay        = document.getElementById('card-overlay');

// Dark Mode
const darkToggle  = document.getElementById('darkToggle');
const bodyDark    = document.getElementById('body-dark');
const cardDark    = document.getElementById('card-dark');

// CVD Filter
const cvdToggle   = document.getElementById('cvdToggle');
const chips       = document.querySelectorAll('.chip[data-mode]');
const bodyCvd     = document.getElementById('body-cvd');
const cardCvd     = document.getElementById('card-cvd');

// Dyslexia teammate zone
const dyslexiaFontToggle = document.getElementById('dyslexiaFontToggle');
const textScaleRange     = document.getElementById('textScaleRange');
const textScaleOutput    = document.getElementById('textScaleOutput');
const bodyDyslexia       = document.getElementById('body-dyslexia');
const cardDyslexiaFont   = document.getElementById('card-dyslexia-font');

// Footer
const statusDot  = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const footerPage = document.getElementById('footerPage');
const previewBar = document.getElementById('previewBar');
const activeBadge= document.getElementById('activeBadge');
const resetBtn   = document.getElementById('resetBtn');

// ─── Accordion click handlers ─────────────────────────────────────────────────
// From ProjectOtter-main — accordion open/close logic
accordionItems.forEach(item => {
  const header = item.querySelector('.accordion-header');
  const content = item.querySelector('.accordion-content');
  header.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    // Close all, then open clicked one (or close if already open)
    accordionItems.forEach(i => {
      i.classList.remove('open');
      i.querySelector('.accordion-content')?.classList.add('hidden');
    });
    if (!isOpen) {
      item.classList.add('open');
      content?.classList.remove('hidden');
    }
  });
});

// ─── Popup initialisation ─────────────────────────────────────────────────────
(async () => {

  try {
    const stored = await chrome.storage.local.get(Object.values(KEYS));
    const s = { ...DEFAULTS, ...stored };

    // Focus Ruler
    rulerToggle.checked   = s[KEYS.RULER_ENABLED];
    heightRange.value     = s[KEYS.RULER_HEIGHT];
    opacityRange.value    = Math.round(s[KEYS.DIM_OPACITY] * 100);
    heightOutput.textContent  = `${s[KEYS.RULER_HEIGHT]} px`;
    opacityOutput.textContent = `${Math.round(s[KEYS.DIM_OPACITY] * 100)}%`;
    expandBody(bodyRuler, s[KEYS.RULER_ENABLED]);
    cardRuler?.classList.toggle('active', s[KEYS.RULER_ENABLED]);

    // Color Overlay
    overlayToggle.checked        = s[KEYS.OVERLAY_ENABLED];
    overlayOpRange.value         = Math.round(s[KEYS.OVERLAY_OPACITY] * 100);
    overlayOpOutput.textContent  = `${Math.round(s[KEYS.OVERLAY_OPACITY] * 100)}%`;
    customColor.value            = s[KEYS.OVERLAY_COLOR];
    setActiveSwatch(s[KEYS.OVERLAY_COLOR]);
    expandBody(bodyOverlay, s[KEYS.OVERLAY_ENABLED]);
    cardOverlay?.classList.toggle('active', s[KEYS.OVERLAY_ENABLED]);

    // Dark Mode
    darkToggle.checked = s[KEYS.DARK_MODE];
    expandBody(bodyDark, s[KEYS.DARK_MODE]);
    cardDark?.classList.toggle('active', s[KEYS.DARK_MODE]);

    // CVD Filter
    cvdToggle.checked = s[KEYS.CVD_ENABLED];
    setActiveChip(s[KEYS.CVD_MODE]);
    expandBody(bodyCvd, s[KEYS.CVD_ENABLED]);
    cardCvd?.classList.toggle('active', s[KEYS.CVD_ENABLED]);

    // Dyslexia teammate zone
    if (dyslexiaFontToggle) dyslexiaFontToggle.checked = s[KEYS.DYSLEXIA_FONT];
    if (textScaleRange)     textScaleRange.value        = s[KEYS.TEXT_SCALE];
    if (textScaleOutput)    textScaleOutput.textContent  = `${s[KEYS.TEXT_SCALE]}%`;
    expandBody(bodyDyslexia, s[KEYS.DYSLEXIA_FONT]);
    cardDyslexiaFont?.classList.toggle('active', s[KEYS.DYSLEXIA_FONT]);

    updateFooter(s);

    // Auto-open the first section that has an active feature
    autoOpenActiveSection(s);

  } catch (err) {
    console.warn('[ProjectOtter Popup] Storage read failed:', err);
  }

  // Show current tab hostname in footer
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const url = new URL(tab.url);
      footerPage.textContent = url.hostname;
      footerPage.title       = url.href;
    }
  } catch (_) {}

})();

// ─── Focus Ruler ──────────────────────────────────────────────────────────────
rulerToggle?.addEventListener('change', async () => {
  const enabled = rulerToggle.checked;
  await chrome.storage.local.set({ [KEYS.RULER_ENABLED]: enabled });
  expandBody(bodyRuler, enabled);
  cardRuler?.classList.toggle('active', enabled);
  refreshFooter();
  sendToTab({ type: 'FOCUS_RULER_TOGGLE', enabled, settings: { height: getHeight(), opacity: getDimOpacity() } });
});

heightRange?.addEventListener('input', () => {
  const h = getHeight();
  heightOutput.textContent = `${h} px`;
  chrome.storage.local.set({ [KEYS.RULER_HEIGHT]: h });
  sendToTab({ type: 'FOCUS_RULER_UPDATE_SETTINGS', settings: { height: h } });
});

opacityRange?.addEventListener('input', () => {
  const pct = parseInt(opacityRange.value, 10);
  const op  = pct / 100;
  opacityOutput.textContent = `${pct}%`;
  chrome.storage.local.set({ [KEYS.DIM_OPACITY]: op });
  sendToTab({ type: 'FOCUS_RULER_UPDATE_SETTINGS', settings: { opacity: op } });
});

// ─── Color Overlay ────────────────────────────────────────────────────────────
overlayToggle?.addEventListener('change', async () => {
  const enabled = overlayToggle.checked;
  await chrome.storage.local.set({ [KEYS.OVERLAY_ENABLED]: enabled });
  expandBody(bodyOverlay, enabled);
  cardOverlay?.classList.toggle('active', enabled);
  refreshFooter();
  sendToTab({ type: 'COLOR_OVERLAY_TOGGLE', enabled, settings: { color: getColor(), opacity: getOverlayOpacity() } });
});

swatches.forEach(swatch => {
  swatch.addEventListener('click', () => {
    const color = swatch.dataset.color;
    setActiveSwatch(color);
    customColor.value = color;
    chrome.storage.local.set({ [KEYS.OVERLAY_COLOR]: color });
    if (overlayToggle.checked) sendToTab({ type: 'COLOR_OVERLAY_UPDATE', settings: { color } });
  });
});

customColor?.addEventListener('input', () => {
  const color = customColor.value;
  setActiveSwatch(null);
  chrome.storage.local.set({ [KEYS.OVERLAY_COLOR]: color });
  if (overlayToggle.checked) sendToTab({ type: 'COLOR_OVERLAY_UPDATE', settings: { color } });
});

overlayOpRange?.addEventListener('input', () => {
  const pct = parseInt(overlayOpRange.value, 10);
  const op  = pct / 100;
  overlayOpOutput.textContent = `${pct}%`;
  chrome.storage.local.set({ [KEYS.OVERLAY_OPACITY]: op });
  if (overlayToggle.checked) sendToTab({ type: 'COLOR_OVERLAY_UPDATE', settings: { opacity: op } });
});

// ─── Dark Mode ────────────────────────────────────────────────────────────────
darkToggle?.addEventListener('change', async () => {
  const enabled = darkToggle.checked;
  await chrome.storage.local.set({ [KEYS.DARK_MODE]: enabled });
  expandBody(bodyDark, enabled);
  cardDark?.classList.toggle('active', enabled);
  refreshFooter();
  sendToTab({ type: 'DARK_MODE_TOGGLE', enabled });
});

// ─── CVD Filter ───────────────────────────────────────────────────────────────
cvdToggle?.addEventListener('change', async () => {
  const enabled = cvdToggle.checked;
  const stored  = await chrome.storage.local.get([KEYS.CVD_MODE]);
  let mode      = stored[KEYS.CVD_MODE] ?? 'none';
  if (enabled && mode === 'none') {
    mode = 'protanopia';
    chrome.storage.local.set({ [KEYS.CVD_MODE]: mode });
    setActiveChip(mode);
  }
  chrome.storage.local.set({ [KEYS.CVD_ENABLED]: enabled });
  expandBody(bodyCvd, enabled);
  cardCvd?.classList.toggle('active', enabled);
  refreshFooter();
  sendToTab({ type: 'CVD_FILTER_TOGGLE', enabled, settings: { mode } });
});

chips.forEach(chip => {
  chip.addEventListener('click', async () => {
    const mode       = chip.dataset.mode;
    const stored     = await chrome.storage.local.get([KEYS.CVD_MODE]);
    const currentMode= stored[KEYS.CVD_MODE];
    if (currentMode === mode) {
      setActiveChip('none');
      chrome.storage.local.set({ [KEYS.CVD_MODE]: 'none', [KEYS.CVD_ENABLED]: false });
      cvdToggle.checked = false;
      cardCvd?.classList.remove('active');
      refreshFooter();
      sendToTab({ type: 'CVD_FILTER_TOGGLE', enabled: false });
    } else {
      setActiveChip(mode);
      chrome.storage.local.set({ [KEYS.CVD_MODE]: mode, [KEYS.CVD_ENABLED]: true });
      cvdToggle.checked = true;
      cardCvd?.classList.add('active');
      refreshFooter();
      sendToTab({ type: 'CVD_FILTER_UPDATE', settings: { mode } });
    }
  });
});

// ─── Dyslexia teammate zone ───────────────────────────────────────────────────
// These are pre-wired to storage so teammates just need to build the engine side.
dyslexiaFontToggle?.addEventListener('change', async () => {
  const enabled = dyslexiaFontToggle.checked;
  await chrome.storage.local.set({ [KEYS.DYSLEXIA_FONT]: enabled });
  expandBody(bodyDyslexia, enabled);
  cardDyslexiaFont?.classList.toggle('active', enabled);
  refreshFooter();
  // Teammate 1: add your message type here when typography-engine.js is ready
  // sendToTab({ type: 'TYPOGRAPHY_TOGGLE', enabled });
});

textScaleRange?.addEventListener('input', () => {
  const scale = parseInt(textScaleRange.value, 10);
  if (textScaleOutput) textScaleOutput.textContent = `${scale}%`;
  chrome.storage.local.set({ [KEYS.TEXT_SCALE]: scale });
  // Teammate 1: add your message type here
  // sendToTab({ type: 'TEXT_SCALE_UPDATE', settings: { scale } });
});

// ─── Reset all ────────────────────────────────────────────────────────────────
resetBtn?.addEventListener('click', async () => {
  await chrome.storage.local.set(DEFAULTS);

  sendToTab({ type: 'FOCUS_RULER_TOGGLE',   enabled: false });
  sendToTab({ type: 'COLOR_OVERLAY_TOGGLE', enabled: false });
  sendToTab({ type: 'DARK_MODE_TOGGLE',     enabled: false });
  sendToTab({ type: 'CVD_FILTER_TOGGLE',    enabled: false });

  // Reset UI
  rulerToggle.checked   = false;
  heightRange.value     = 40;   heightOutput.textContent  = '40 px';
  opacityRange.value    = 75;   opacityOutput.textContent = '75%';

  overlayToggle.checked = false;
  overlayOpRange.value  = 15;   overlayOpOutput.textContent = '15%';
  customColor.value     = '#ffff99';
  setActiveSwatch('#ffff99');

  darkToggle.checked = false;
  cvdToggle.checked  = false;
  setActiveChip('none');

  if (dyslexiaFontToggle) dyslexiaFontToggle.checked = false;
  if (textScaleRange)     textScaleRange.value        = 100;
  if (textScaleOutput)    textScaleOutput.textContent  = '100%';

  [bodyRuler, bodyOverlay, bodyDark, bodyCvd, bodyDyslexia].forEach(b => expandBody(b, false));
  [cardRuler, cardOverlay, cardDark, cardCvd, cardDyslexiaFont].forEach(c => c?.classList.remove('active'));
  document.querySelectorAll('.accordion-item').forEach(i => {
    i.classList.remove('open', 'has-active');
    i.querySelector('.accordion-content')?.classList.add('hidden');
  });

  updateFooter(DEFAULTS);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getHeight()        { return parseInt(heightRange.value, 10); }
function getDimOpacity()    { return parseInt(opacityRange.value, 10) / 100; }
function getColor()         { return customColor.value; }
function getOverlayOpacity(){ return parseInt(overlayOpRange.value, 10) / 100; }

function expandBody(el, open) {
  el?.classList.toggle('hidden', !open);
}

function setActiveSwatch(color) {
  swatches.forEach(s => {
    const match = color !== null && s.dataset.color === color;
    s.classList.toggle('selected', match);
    s.setAttribute('aria-checked', String(match));
  });
}

function setActiveChip(mode) {
  chips.forEach(c => {
    const match = c.dataset.mode === mode;
    c.classList.toggle('selected', match);
    c.setAttribute('aria-checked', String(match));
  });
}

async function refreshFooter() {
  const stored = await chrome.storage.local.get(Object.values(KEYS));
  updateFooter({ ...DEFAULTS, ...stored });
}

function updateFooter(s) {
  const active = [
    s[KEYS.RULER_ENABLED],
    s[KEYS.OVERLAY_ENABLED],
    s[KEYS.DARK_MODE],
    s[KEYS.CVD_ENABLED],
    s[KEYS.DYSLEXIA_FONT],
  ].filter(Boolean).length;

  const hasActive = active > 0;
  statusDot?.classList.toggle('active', hasActive);
  previewBar?.classList.toggle('visible', hasActive);
  if (activeBadge) activeBadge.classList.toggle('hidden', !hasActive);

  if (statusText) {
    statusText.textContent = hasActive
      ? `${active} feature${active > 1 ? 's' : ''} active`
      : 'No features active';
  }

  // Card borders
  cardRuler?.classList.toggle('active',        !!s[KEYS.RULER_ENABLED]);
  cardOverlay?.classList.toggle('active',      !!s[KEYS.OVERLAY_ENABLED]);
  cardDark?.classList.toggle('active',         !!s[KEYS.DARK_MODE]);
  cardCvd?.classList.toggle('active',          !!s[KEYS.CVD_ENABLED]);
  cardDyslexiaFont?.classList.toggle('active', !!s[KEYS.DYSLEXIA_FONT]);

  // Section-level amber border if any card inside is active
  const adhdActive = !!s[KEYS.RULER_ENABLED];
  const dyslexiaActive = !!s[KEYS.OVERLAY_ENABLED] || !!s[KEYS.DYSLEXIA_FONT];
  const cbActive = !!s[KEYS.DARK_MODE] || !!s[KEYS.CVD_ENABLED];
  document.getElementById('section-adhd')?.classList.toggle('has-active', adhdActive);
  document.getElementById('section-dyslexia')?.classList.toggle('has-active', dyslexiaActive);
  document.getElementById('section-colorblind')?.classList.toggle('has-active', cbActive);
}

function autoOpenActiveSection(s) {
  const adhdActive     = !!s[KEYS.RULER_ENABLED];
  const dyslexiaActive = !!s[KEYS.OVERLAY_ENABLED] || !!s[KEYS.DYSLEXIA_FONT];
  const cbActive       = !!s[KEYS.DARK_MODE] || !!s[KEYS.CVD_ENABLED];

  const sectionMap = [
    { id: 'section-adhd',       active: adhdActive },
    { id: 'section-dyslexia',   active: dyslexiaActive },
    { id: 'section-colorblind', active: cbActive },
  ];

  for (const { id, active } of sectionMap) {
    if (active) {
      const el = document.getElementById(id);
      el?.classList.add('open');
      el?.querySelector('.accordion-content')?.classList.remove('hidden');
      break; // Open only the first active section
    }
  }
}

async function sendToTab(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, message);
  } catch (_) {
    // Silently fail on restricted pages — storage write still happened
  }
}