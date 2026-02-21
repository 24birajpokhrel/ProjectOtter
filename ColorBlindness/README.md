# 👁 AccessiLens – Visual Accessibility Extension

A Chrome Manifest V3 extension providing visual accessibility tools for students with **dyslexia**, **ADHD**, and **colorblindness**.

---

## 🚀 Features (This Module)

| Feature | Target Users | How It Works |
|---|---|---|
| **Color Overlay / Tint** | ADHD, Dyslexia | Injects a fixed `<div>` with `pointer-events: none` over the page |
| **Dark Mode** | All users | CSS class injected on `<html>` with comprehensive dark overrides |
| **Colorblindness Filter** | Color Vision Deficiency | SVG `<feColorMatrix>` filters applied via CSS `filter` property |

---

## 📁 File Structure

```
accessibility-extension/
├── manifest.json          # MV3 manifest
├── background.js          # Service worker – state manager & tab listener
├── content.js             # Content script – injects DOM features
├── content.css            # Minimal base styles for injected elements
├── popup.html             # Extension popup UI
├── popup.js               # Popup logic & Chrome messaging
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────┐
│                  POPUP (popup.html/js)            │
│  UI Controls → chrome.runtime.sendMessage()       │
└────────────────────────┬─────────────────────────┘
                         │ SET_STATE message
                         ▼
┌──────────────────────────────────────────────────┐
│             BACKGROUND SERVICE WORKER            │
│  • Persists state to chrome.storage.sync         │
│  • Forwards APPLY_STATE to active tab            │
│  • Re-applies state on tab navigation            │
└────────────────────────┬─────────────────────────┘
                         │ APPLY_STATE message
                         ▼
┌──────────────────────────────────────────────────┐
│              CONTENT SCRIPT (content.js)         │
│  • applyOverlay()   → injects/removes <div>      │
│  • applyDarkMode()  → toggles CSS class + style  │
│  • applyColorblind()→ injects SVG filter + CSS   │
└──────────────────────────────────────────────────┘
```

---

## 🎨 Colorblindness Filters

Uses SVG `<feColorMatrix>` with clinically-derived matrices:

| Mode | Type | Simulates |
|---|---|---|
| `protanopia` | Red-Green | Absence of red cones |
| `deuteranopia` | Red-Green | Absence of green cones |
| `tritanopia` | Blue-Yellow | Absence of blue cones |

The SVG is injected as a hidden `0×0` element, and the filter is applied via:
```css
html { filter: url(#cb-protanopia) !important; }
```

---

## 🔒 Security & Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Apply features to current page only |
| `scripting` | Inject content script on demand |
| `storage` | Persist user preferences across sessions |
| `tabs` | Re-apply state on tab navigation |
| `<all_urls>` | Work on any website the user visits |

**No data is collected. All state is local to `chrome.storage.sync`.**

---

## 📦 Installation (Developer Mode)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder
5. Click the 🧩 puzzle icon in Chrome toolbar → pin **AccessiLens**

---

## 🗺 Development Roadmap

- [x] Color Overlay / Tint
- [x] Dark Mode
- [x] Colorblindness SVG Filters (Protanopia, Deuteranopia, Tritanopia)
- [ ] Dyslexia Font Swap (OpenDyslexic injection)
- [ ] Text Scaling Slider
- [ ] Focus Ruler (ADHD reading mask)
- [ ] Bionic Reading (bold first letters)
- [ ] Voice-to-Text integration
- [ ] Keyboard navigation shortcuts
- [ ] Word definition on double-click
