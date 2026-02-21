// popup.js – AccessiLens Popup Controller

'use strict';

// ─── Default State ───────────────────────────────────────────────────────────
const DEFAULT_STATE = {
  overlay: { enabled: false, color: '#ffff99', opacity: 0.15 },
  darkMode: { enabled: false },
  colorblind: { enabled: false, mode: 'none' }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

// ─── DOM References ──────────────────────────────────────────────────────────
const toggleOverlay   = document.getElementById('toggle-overlay');
const toggleDark      = document.getElementById('toggle-dark');
const toggleCB        = document.getElementById('toggle-cb');

const bodyOverlay     = document.getElementById('body-overlay');
const bodyDark        = document.getElementById('body-dark');
const bodyCB          = document.getElementById('body-cb');

const sectionOverlay  = document.getElementById('section-overlay');
const sectionDark     = document.getElementById('section-dark');
const sectionCB       = document.getElementById('section-cb');

const swatches        = document.querySelectorAll('#swatches .swatch');
const customColor     = document.getElementById('custom-color');
const sliderOpacity   = document.getElementById('slider-opacity');
const opacityLabel    = document.getElementById('opacity-label');

const pills           = document.querySelectorAll('.pill[data-mode]');

const resetBtn        = document.getElementById('reset-btn');
const statusText      = document.getElementById('status-text');
const previewStrip    = document.getElementById('previewStrip');

// ─── Utility ─────────────────────────────────────────────────────────────────
function sendState() {
  chrome.runtime.sendMessage({ type: 'SET_STATE', state });
  updateUI();
}

function updateUI() {
  // Active feature count for status
  const active = [
    state.overlay.enabled,
    state.darkMode.enabled,
    state.colorblind.enabled
  ].filter(Boolean).length;

  if (active === 0) {
    statusText.innerHTML = 'No features active';
    previewStrip.classList.remove('visible');
  } else {
    statusText.innerHTML = `<span>${active} feature${active > 1 ? 's' : ''} active</span>`;
    previewStrip.classList.add('visible');
  }

  // Section highlight
  sectionOverlay.classList.toggle('active', state.overlay.enabled);
  sectionDark.classList.toggle('active', state.darkMode.enabled);
  sectionCB.classList.toggle('active', state.colorblind.enabled);
}

function expandSection(bodyEl, isOpen) {
  bodyEl.classList.toggle('hidden', !isOpen);
}

// ─── Load Saved State ────────────────────────────────────────────────────────
chrome.storage.sync.get('accessiLensState', (data) => {
  if (data.accessiLensState) {
    state = data.accessiLensState;
  }
  renderFromState();
});

function renderFromState() {
  // Overlay
  toggleOverlay.checked = state.overlay.enabled;
  expandSection(bodyOverlay, state.overlay.enabled);
  sliderOpacity.value = Math.round(state.overlay.opacity * 100);
  opacityLabel.textContent = Math.round(state.overlay.opacity * 100) + '%';
  customColor.value = state.overlay.color;

  // Select matching swatch
  swatches.forEach(s => {
    s.classList.toggle('selected', s.dataset.color === state.overlay.color);
  });

  // Dark mode
  toggleDark.checked = state.darkMode.enabled;
  expandSection(bodyDark, state.darkMode.enabled);

  // Colorblind
  toggleCB.checked = state.colorblind.enabled;
  expandSection(bodyCB, state.colorblind.enabled);
  pills.forEach(p => {
    p.classList.toggle('selected', p.dataset.mode === state.colorblind.mode);
  });

  updateUI();
}

// ─── Toggle Handlers ─────────────────────────────────────────────────────────
toggleOverlay.addEventListener('change', () => {
  state.overlay.enabled = toggleOverlay.checked;
  expandSection(bodyOverlay, state.overlay.enabled);
  sendState();
});

toggleDark.addEventListener('change', () => {
  state.darkMode.enabled = toggleDark.checked;
  expandSection(bodyDark, state.darkMode.enabled);
  sendState();
});

toggleCB.addEventListener('change', () => {
  state.colorblind.enabled = toggleCB.checked;
  expandSection(bodyCB, state.colorblind.enabled);
  // Default to protanopia if no mode selected
  if (state.colorblind.enabled && state.colorblind.mode === 'none') {
    state.colorblind.mode = 'protanopia';
    pills.forEach(p => {
      p.classList.toggle('selected', p.dataset.mode === 'protanopia');
    });
  }
  sendState();
});

// ─── Swatch Clicks ───────────────────────────────────────────────────────────
swatches.forEach(swatch => {
  swatch.addEventListener('click', () => {
    swatches.forEach(s => s.classList.remove('selected'));
    swatch.classList.add('selected');
    state.overlay.color = swatch.dataset.color;
    customColor.value = swatch.dataset.color;
    if (state.overlay.enabled) sendState();
  });
});

// ─── Custom Color Picker ─────────────────────────────────────────────────────
customColor.addEventListener('input', () => {
  swatches.forEach(s => s.classList.remove('selected'));
  state.overlay.color = customColor.value;
  if (state.overlay.enabled) sendState();
});

customColor.addEventListener('change', () => {
  sendState();
});

// ─── Opacity Slider ──────────────────────────────────────────────────────────
sliderOpacity.addEventListener('input', () => {
  const val = parseInt(sliderOpacity.value);
  opacityLabel.textContent = val + '%';
  state.overlay.opacity = val / 100;
  if (state.overlay.enabled) sendState();
});

// ─── Colorblind Pill Selection ────────────────────────────────────────────────
pills.forEach(pill => {
  pill.addEventListener('click', () => {
    const mode = pill.dataset.mode;

    // Toggle off if already selected
    if (state.colorblind.mode === mode) {
      state.colorblind.mode = 'none';
      pills.forEach(p => p.classList.remove('selected'));
    } else {
      state.colorblind.mode = mode;
      pills.forEach(p => {
        p.classList.toggle('selected', p.dataset.mode === mode);
      });
    }

    // Auto-enable CB toggle when a mode is picked
    if (state.colorblind.mode !== 'none' && !state.colorblind.enabled) {
      state.colorblind.enabled = true;
      toggleCB.checked = true;
    }

    sendState();
  });
});

// ─── Reset All ───────────────────────────────────────────────────────────────
resetBtn.addEventListener('click', () => {
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  renderFromState();
  sendState();
});
