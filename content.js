function applyFont(dyslexiaState) {
    const existingStyle = document.getElementById('dyslexia-font-override');
    if (existingStyle) {
        existingStyle.remove();
    }

    if (!dyslexiaState.enabled || dyslexiaState.font === 'default') {
        return ;
    }

    const style = document.createElement('style');
    style.id = 'dyslexia-font-override';
    let fontFaceCSS = '';

    if (dyslexiaState.font === 'OpenDyslexic') {
        const fontUrl = chrome.runtime.getURL('fonts/OpenDyslexic3-Regular.ttf');
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

function applyOverlay(overlayState) {
  // e.g., if (overlayState.enabled) { create div, set background to overlayState.color, set opacity }
}

function applyDarkMode(darkModeState) {
  // e.g., if (darkModeState.enabled) { inject CSS to invert colors }
}

function applyColorblind(cbState) {
  // e.g., if (cbState.enabled) { inject SVG filter based on cbState.mode }
}


// ==========================================
// 3. MASTER STATE CONTROLLER (MERGED LOGIC)
// ==========================================

// This function acts as the "Traffic Cop", sending the right data to the right function
function applyAllStates(state) {
  if (!state) return;
  
  // Run your feature
  if (state.dyslexia) applyFont(state.dyslexia);
  
  // Run teammate's features
  if (state.overlay) applyOverlay(state.overlay);
  if (state.darkMode) applyDarkMode(state.darkMode);
  if (state.colorblind) applyColorblind(state.colorblind);
}

// 1. Load everything when the webpage first opens
chrome.storage.sync.get('accessiLensState', (data) => {
  if (data.accessiLensState) {
    applyAllStates(data.accessiLensState);
  }
});

// 2. Listen for live updates when the user clicks sliders/dropdowns in the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SET_STATE' && request.state) {
    applyAllStates(request.state);
  }
});