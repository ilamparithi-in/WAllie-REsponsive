# WAllie - REsponsive

> **Adaptive responsive single-column layout for small/tiling windows and custom chat wallpapers for WhatsApp Web.**  
> *Reverse-engineered client-side layout engine built as a Chromium Manifest V3 extension.*

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Target: WhatsApp Web](https://img.shields.io/badge/Target-WhatsApp%20Web-25D366.svg)](https://web.whatsapp.com)


## The Problem

WhatsApp Web was designed exclusively for widescreen browser windows. When used:
- In half-screen split views,
- On vertical / portrait monitors,
- On low-resolution laptops or sub-notebooks,
- Or inside **Tiling Window Managers** (i3, Sway, Hyprland, bspwm),

The interface breaks: chat lists overlap conversation views, text inputs get crushed, and navigating conversations becomes cumbersome. Furthermore, WhatsApp Web offers no support for custom chat pane wallpapers.

## The Solution: Reverse Engineered

**WAllie - REsponsive** reverse-engineers WhatsApp Web's layout tree and DOM attributes to provide an adaptive mobile-like single-column view and custom wallpaper engine:

1. **Adaptive Viewport Engine**: Automatically detects window width ($\le 900\text{px}$) and transitions the UI from dual-pane into a single-pane layout with smooth horizontal slide animations.
2. **Mobile-Style Back Navigation**: Seamlessly injects a native-feeling back button into the chat header, allowing smooth switching between chat list and conversation panes.
3. **Custom Wallpaper Engine**: Injects custom chat wallpapers directly into the active conversation pane, featuring client-side canvas downscaling (max $1920\text{px}$ JPEG at 82% quality) to guarantee peak rendering performance.
4. **100% Client-Side**: Operates entirely in your local browser with zero telemetry or network calls.



## Features

- 📱 **Adaptive Portrait Mode**: Auto-collapses into a clean single-pane layout when the window is narrow ($\le 900\text{px}$).
- 🪟 **Tiling Window Manager Friendly**: Built specifically for tiling window managers where windows frequently resize into vertical columns.
- 🔙 **Header Back Button**: Injects a WhatsApp-styled back button for effortless list/chat navigation.
- 🎨 **Custom Chat Wallpaper**: Upload custom backgrounds (JPEG, PNG, WebP) with live preview and automatic downscaling.
- ⚙️ **Configurable Layout Modes**: Choose between **Auto (Responsive)**, **Always Portrait**, or **Always Landscape** via the extension popup.
- 🔒 **Zero Permissions Overhead**: Only requests `storage` to persist your layout mode and wallpaper locally.



## Layout Modes

| Mode | Behavior | Best Used For |
| :--- | :--- | :--- |
| **Auto (Responsive)** | Automatically switches to single-column portrait view when width $\le 900\text{px}$; dual-column on wider screens. | Default / General use, dynamic window tiling. |
| **Always Portrait** | Forces single-pane mobile layout regardless of screen width. | Vertical monitors, dedicated mobile simulation. |
| **Always Landscape** | Disables portrait folding and enforces dual-pane desktop view. | Standard wide desktop monitors. |


## How It Works

1. **State & Observer Engine (`scripts/content.js`)**: Monitors DOM mutations and viewport resize events, managing `data-portrait-view` attributes (`list`, `chat`, `info`) on `document.documentElement`.
2. **Transition & Isolation Styles (`styles/styles.css`)**: Hardware-accelerated CSS rules that power smooth single-pane transitions without breaking WhatsApp's underlying React/Preact components.
3. **Wallpaper Processor (`popup/popup.js`)**: Canvas-based downscaler that resamples uploaded images to high-efficiency JPEGs stored in `chrome.storage.local`.


## Installation

### Method A: Install in Google Chrome / Chromium / Brave / Edge (Unpacked)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/ilamparithi-in/WAllie-REsponsive.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the cloned `WAllie-REsponsive` directory.
5. Open [WhatsApp Web](https://web.whatsapp.com) and resize your window below $900\text{px}$ to test!

### Method B: Built into WAllie Desktop

If you use [WAllie (Unofficial Electron-based WhatsApp Client for Linux with Multi-account and Extensions Support)](https://github.com/ilamparithi-in/WAllie), this extension is bundled natively as an integrated built-in extension under **Settings &rarr; Extensions**.


## Donate
Like my work? Consider buying me a Biriyani! [Donate](https://pseudosmp.github.io/donate)