/**
 * WAllie - REsponsive: Popup Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const modeAuto = document.getElementById('mode-auto');
  const modePortrait = document.getElementById('mode-portrait');
  const modeDisabled = document.getElementById('mode-disabled');
  const modeDesc = document.getElementById('mode-desc');
  const disableAnimations = document.getElementById('toggle-disable-animations');
  const wallpaperPreview = document.getElementById('wallpaper-preview');
  const fileInput = document.getElementById('wallpaper-file-input');
  const clearWallpaperBtn = document.getElementById('clear-wallpaper-btn');

  const DESCRIPTIONS = {
    auto: 'Auto collapses to single column when window width \u2264 900px.',
    portrait: 'Always uses single-pane mobile layout regardless of window width.',
    disabled: 'Always uses dual-pane desktop layout (disabled portrait view).'
  };

  function updateLayoutModeUI(mode) {
    if (mode === 'portrait' && modePortrait) modePortrait.checked = true;
    else if (mode === 'disabled' && modeDisabled) modeDisabled.checked = true;
    else if (modeAuto) modeAuto.checked = true;

    if (modeDesc) modeDesc.textContent = DESCRIPTIONS[mode] || DESCRIPTIONS.auto;
  }

  function updateWallpaperUI(dataUrl) {
    if (!wallpaperPreview) return;
    if (dataUrl) {
      wallpaperPreview.style.backgroundImage = `url("${dataUrl}")`;
      wallpaperPreview.innerHTML = '<span class="custom-badge">Custom</span>';
      if (clearWallpaperBtn) clearWallpaperBtn.style.display = 'inline-flex';
    } else {
      wallpaperPreview.style.backgroundImage = '';
      wallpaperPreview.innerHTML = '<span id="no-wallpaper-label">Default Pattern</span>';
      if (clearWallpaperBtn) clearWallpaperBtn.style.display = 'none';
    }
  }

  chrome.storage?.local?.get?.(['layoutMode', 'disableAnimations', 'customWallpaper'], (items) => {
    if (items) {
      updateLayoutModeUI(items.layoutMode || 'auto');
      if (disableAnimations) {
        disableAnimations.checked = !!items.disableAnimations;
      }
      updateWallpaperUI(items.customWallpaper);
    }
  });

  const handleModeChange = (e) => {
    const mode = e.target.value;
    chrome.storage?.local?.set?.({ layoutMode: mode });
    updateLayoutModeUI(mode);
  };

  modeAuto?.addEventListener('change', handleModeChange);
  modePortrait?.addEventListener('change', handleModeChange);
  modeDisabled?.addEventListener('change', handleModeChange);

  disableAnimations?.addEventListener('change', (e) => {
    chrome.storage?.local?.set?.({ disableAnimations: e.target.checked });
  });

  fileInput?.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const rawDataUrl = reader.result;
        const img = new Image();
        img.onload = () => {
          try {
            const MAX_DIM = 1920;
            let w = img.width;
            let h = img.height;
            if (w > MAX_DIM || h > MAX_DIM) {
              if (w > h) {
                h = Math.round((h * MAX_DIM) / w);
                w = MAX_DIM;
              } else {
                w = Math.round((w * MAX_DIM) / h);
                h = MAX_DIM;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const processedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
              chrome.storage?.local?.set?.({ customWallpaper: processedDataUrl });
              updateWallpaperUI(processedDataUrl);
            }
          } catch (err) {
            console.error('Failed to process wallpaper canvas:', err);
          }
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to read image file:', err);
    }
    fileInput.value = '';
  });

  clearWallpaperBtn?.addEventListener('click', () => {
    chrome.storage?.local?.set?.({ customWallpaper: '' });
    updateWallpaperUI('');
  });
});
