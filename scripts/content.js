/**
 * WAllie - REsponsive: Content Script
 * Adaptive single-column layout engine and custom wallpaper injector for WhatsApp Web.
 */

const BACK_BTN_CLASS = 'wa-back-button';
const WALLPAPER_STYLE_ID = 'wa-custom-wallpaper-style';

let currentMode = 'auto';
let isPortraitActive = false;
let isLandscapeSidebarCollapsed = false;
let currentViewState = 'list';

function setPortraitViewState(view) {
  const previousState = currentViewState;
  currentViewState = view;
  if (isPortraitActive && document.documentElement) {
    const currentStateAttr = document.documentElement.getAttribute('data-portrait-view');
    document.documentElement.setAttribute('data-portrait-view', view);
    if (view === 'chat') {
      lockMainScreenScroll();
      injectBackButton();
      setTimeout(injectBackButton, 50);
      setTimeout(injectBackButton, 150);
      setTimeout(injectBackButton, 300);
    }
    if (previousState !== view || currentStateAttr !== view) {
      window.dispatchEvent(new Event('resize'));
    }
  }
}

function updateLandscapeSidebar() {
  if (!document.documentElement) return;
  if (!isPortraitActive && isLandscapeSidebarCollapsed) {
    document.documentElement.setAttribute('data-wallie-sidebar-collapsed', 'true');
  } else {
    document.documentElement.removeAttribute('data-wallie-sidebar-collapsed');
  }
  window.dispatchEvent(new Event('resize'));
}

function updatePortraitState() {
  if (!document.documentElement) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updatePortraitState, { once: true });
    }
    return;
  }

  let shouldBePortrait = false;
  if (currentMode === 'disabled') {
    shouldBePortrait = false;
  } else if (currentMode === 'portrait') {
    shouldBePortrait = true;
  } else {
    const w = window.innerWidth;
    const h = window.innerHeight;
    shouldBePortrait = w <= 900 || w < h;
  }

  if (isPortraitActive !== shouldBePortrait) {
    isPortraitActive = shouldBePortrait;
    if (isPortraitActive) {
      document.documentElement.setAttribute('data-wallie-portrait', 'true');
      document.documentElement.setAttribute('data-portrait-view', currentViewState);
      document.documentElement.removeAttribute('data-wallie-sidebar-collapsed');
      lockMainScreenScroll();
    } else {
      document.documentElement.removeAttribute('data-wallie-portrait');
      document.documentElement.removeAttribute('data-portrait-view');
      updateLandscapeSidebar();
    }
    window.dispatchEvent(new Event('resize'));
  }
}

function lockMainScreenScroll() {
  const container = document.querySelector('[data-testid="wa-web-main-screen"] > div');
  if (!container) return;
  if (!container.__waScrollLocked) {
    container.__waScrollLocked = true;
    const origDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft');
    if (origDescriptor) {
      Object.defineProperty(container, 'scrollLeft', {
        get() {
          return origDescriptor.get ? origDescriptor.get.call(this) : 0;
        },
        set(val) {
          if (isPortraitActive) {
            if (origDescriptor.set) origDescriptor.set.call(this, 0);
            return;
          }
          if (origDescriptor.set) origDescriptor.set.call(this, val);
        },
        configurable: true
      });
    }

    const origScrollTo = container.scrollTo;
    if (origScrollTo) {
      container.scrollTo = function (optionsOrX, _y) {
        if (isPortraitActive) {
          if (typeof optionsOrX === 'object' && optionsOrX !== null) {
            optionsOrX = { ...optionsOrX, left: 0 };
          } else {
            optionsOrX = 0;
          }
        }
        return origScrollTo.apply(this, arguments);
      };
    }

    container.addEventListener(
      'scroll',
      () => {
        if (isPortraitActive && container.scrollLeft !== 0) {
          if (origDescriptor?.set) origDescriptor.set.call(container, 0);
          else container.scrollLeft = 0;
        }
      },
      { passive: false }
    );
  }
  if (isPortraitActive && container.scrollLeft !== 0) {
    container.scrollLeft = 0;
  }
}

function createBackButton() {
  const btn = document.createElement('button');
  btn.className = `${BACK_BTN_CLASS} html-button`;
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', 'Back');
  btn.setAttribute('title', 'Back');
  btn.innerHTML = `
    <span aria-hidden="true">
      <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" fill="currentColor">
        <title>ic-arrow-back</title>
        <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
      </svg>
    </span>
  `;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPortraitViewState('list');
  });
  return btn;
}

function injectBackButton() {
  const header = document.querySelector('#main header');
  if (!header) return;
  const existingBtn = header.querySelector(`.${BACK_BTN_CLASS}`);
  if (!existingBtn) {
    const backBtn = createBackButton();
    header.insertBefore(backBtn, header.firstChild);
  } else if (existingBtn.parentElement !== header) {
    header.insertBefore(existingBtn, header.firstChild);
  }
}

function getActiveTabLabel() {
  return (
    document
      .querySelector(
        '[data-testid="wa-web-main-screen"] > div > header button[aria-pressed="true"]'
      )
      ?.getAttribute('aria-label')
      ?.toLowerCase() || 'chats'
  );
}

function applyCustomWallpaper(wallpaperData) {
  let styleEl = document.getElementById(WALLPAPER_STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = WALLPAPER_STYLE_ID;
    (document.head || document.documentElement)?.appendChild(styleEl);
  }
  if (wallpaperData && wallpaperData.trim()) {
    styleEl.textContent = `
      #main {
        background-image: url(${JSON.stringify(wallpaperData.trim())}) !important;
        background-size: cover !important;
        background-position: center center !important;
        background-repeat: no-repeat !important;
      }
    `;
  } else {
    styleEl.textContent = '';
  }
}

function setupEventListeners() {
  const handleChatListItemInteraction = (target, isMouseDown, event) => {
    const chatListItem = target.closest(
      '#side [role="row"], #side [data-testid^="list-item-"], #side [role="listitem"]'
    );
    if (!chatListItem) return false;

    if (
      !!target.closest(
        '[data-testid="down-context"], [data-icon="down-context"], [data-testid="context-btn"], [aria-label*="context menu" i], input[type="checkbox"], [role="checkbox"], [data-testid="select-checkbox"]'
      )
    ) {
      return true;
    }

    if (
      !target.closest(
        '[data-testid="cell-frame-container"], [data-testid="cell-frame-title"], [data-testid="cell-frame-primary-detail"], [data-testid="cell-frame-secondary"]'
      ) &&
      isMouseDown &&
      !event.__waForwarded
    ) {
      const targetCell = chatListItem.querySelector('[data-testid="cell-frame-container"]');
      if (targetCell) {
        const syntheticMousedown = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window,
          button: 0,
          buttons: 1
        });
        syntheticMousedown.__waForwarded = true;
        targetCell.dispatchEvent(syntheticMousedown);
      }
    }

    if (isPortraitActive) {
      setPortraitViewState('chat');
      setTimeout(injectBackButton, 50);
    }
    return true;
  };

  const handleDrawerItemInteraction = (target) => {
    if (
      !target.closest(
        '[data-testid="drawer-left"] [role="row"], [data-testid="drawer-left"] [data-testid^="list-item-"], [data-testid="drawer-left"] [role="listitem"], [data-testid="drawer-left"] [role="button"]'
      )
    ) {
      return false;
    }
    const activeTab = getActiveTabLabel();
    if (activeTab.includes('call')) {
      const isCallItem =
        !!target.closest(
          '[data-testid="cell-frame-container"], [data-testid="cell-frame-title"]'
        ) && !target.closest('button, [role="button"]:not([role="row"])');
      if (isPortraitActive && isCallItem) {
        setPortraitViewState('chat');
      }
      return true;
    } else if (activeTab.includes('channel')) {
      const isChannelItem = !target.closest(
        '[data-testid="down-context"], [data-icon="down-context"], button'
      );
      if (isPortraitActive && isChannelItem) {
        setPortraitViewState('chat');
        setTimeout(injectBackButton, 50);
      }
      return true;
    } else if (activeTab.includes('communit')) {
      const isSubgroup = !!target.closest(
        '[data-testid="community-tab-subgroup-cell"], [data-testid="cell-frame-container"]'
      );
      const isCommunityHeader = !!target.closest(
        '[data-testid="community-tab-community-cell"], [data-testid="new-community-row"]'
      );
      if (isSubgroup && !isCommunityHeader) {
        if (isPortraitActive) {
          setPortraitViewState('chat');
          setTimeout(injectBackButton, 50);
        }
      }
      return true;
    }
    return false;
  };

  window.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 0) return;
      const target = e.target;
      if (!target) return;
      if (handleChatListItemInteraction(target, true, e)) return;
      if (handleDrawerItemInteraction(target)) return;
    },
    true
  );

  window.addEventListener(
    'click',
    (e) => {
      const target = e.target;
      if (!target) return;

      const railButton = target.closest(
        '[data-testid="wa-web-main-screen"] > div > header[data-testid="chatlist-header"] button'
      );
      if (railButton) {
        if (railButton.getAttribute('aria-pressed') === 'true') {
          if (getActiveTabLabel().includes('communit')) {
            if (isPortraitActive && (currentViewState === 'chat' || currentViewState === 'info')) {
              setPortraitViewState('list');
            }
            return;
          }
          if (isPortraitActive) {
            if (currentViewState === 'chat' || currentViewState === 'info') {
              setPortraitViewState('list');
            } else {
              setPortraitViewState('chat');
            }
          } else {
            isLandscapeSidebarCollapsed = !isLandscapeSidebarCollapsed;
            updateLandscapeSidebar();
          }
        } else if (isPortraitActive) {
          setPortraitViewState('list');
        } else if (isLandscapeSidebarCollapsed) {
          isLandscapeSidebarCollapsed = false;
          updateLandscapeSidebar();
        }
        return;
      }

      if (handleChatListItemInteraction(target, false, e)) return;
      if (handleDrawerItemInteraction(target)) return;
      if (target.closest(`.${BACK_BTN_CLASS}`)) return;

      const chatHeaderTitle = target.closest(
        '#main header [data-testid="conversation-info-header"], #main header [data-testid="conversation-info-header-button"], #main header > div:first-of-type [role="button"]'
      );
      if (chatHeaderTitle && !chatHeaderTitle.classList.contains(BACK_BTN_CLASS)) {
        setTimeout(() => {
          const drawerRight = document.querySelector('[data-testid="drawer-right"]');
          if (isPortraitActive && drawerRight && drawerRight.children.length > 0) {
            setPortraitViewState('info');
          }
        }, 120);
        return;
      }

      if (
        target.closest(
          '[data-testid="drawer-right"] button[aria-label="Close"], [data-testid="drawer-right"] [aria-label="Close"]'
        )
      ) {
        if (isPortraitActive) setPortraitViewState('chat');
        return;
      }

      if (
        target.closest(
          '[data-testid="drawer-middle"] button[aria-label="Close"], [data-testid="drawer-middle"] [aria-label="Close"]'
        )
      ) {
        if (isPortraitActive) {
          if (getActiveTabLabel().includes('call')) {
            setPortraitViewState('list');
          } else {
            setPortraitViewState('chat');
          }
        }
        return;
      }

      // Fullscreen exit button click interception when already in fullscreen
      const fsToggleBtn = target.closest(
        'button[aria-label="Full screen"], [role="button"][aria-label="Full screen"]'
      );
      if (fsToggleBtn && document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
        document.exitFullscreen().catch(() => {});
        return;
      }
    },
    true
  );

  window.addEventListener('resize', updatePortraitState);

  try {
    const mqWidth = window.matchMedia('(max-width: 900px)');
    const mqPortrait = window.matchMedia('(orientation: portrait)');
    mqWidth.addEventListener('change', () => updatePortraitState());
    mqPortrait.addEventListener('change', () => updatePortraitState());
  } catch {}

  const observer = new MutationObserver(() => {
    if (!isPortraitActive) return;
    lockMainScreenScroll();
    const drawerRight = document.querySelector('[data-testid="drawer-right"]');
    const isThreeColumns = document
      .querySelector('[data-testid="wa-web-main-screen"] > div')
      ?.classList.contains('three');
    if (isThreeColumns && drawerRight && drawerRight.clientWidth > 10 && currentViewState !== 'info') {
      setPortraitViewState('info');
    } else if (!isThreeColumns && currentViewState === 'info') {
      setPortraitViewState('chat');
    }
    if (currentViewState === 'chat') {
      injectBackButton();
    }
  });

  const startObserving = () => {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.body) {
    startObserving();
  } else {
    document.addEventListener('DOMContentLoaded', startObserving, { once: true });
  }

  window.addEventListener('wa-portrait-view-change', (e) => {
    if (e.detail?.view) setPortraitViewState(e.detail.view);
  });
}

function initSettings() {
  try {
    chrome.storage?.local?.get?.(['layoutMode', 'customWallpaper'], (items) => {
      if (items) {
        if (items.layoutMode) {
          currentMode = items.layoutMode;
          updatePortraitState();
        }
        if (items.customWallpaper !== undefined) {
          applyCustomWallpaper(items.customWallpaper);
        }
      }
    });

    chrome.storage?.onChanged?.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.layoutMode) {
          currentMode = changes.layoutMode.newValue || 'auto';
          updatePortraitState();
        }
        if (changes.customWallpaper) {
          applyCustomWallpaper(changes.customWallpaper.newValue || '');
        }
      }
    });
  } catch {}
}

function setupFullscreenRecovery() {
  const handleEscape = (e) => {
    if (e.key === 'Escape' && document.fullscreenElement) {
      e.preventDefault();
      e.stopPropagation();
      document.exitFullscreen().catch(() => {});
    }
  };

  window.addEventListener('keydown', handleEscape, true);
  document.addEventListener('keydown', handleEscape, true);

  let exitBtnTimeout = null;

  function updateFullscreenOverlay() {
    const fsEl = document.fullscreenElement;
    const existingBtn = document.getElementById('wa-fullscreen-exit-button');

    if (!fsEl) {
      if (existingBtn) existingBtn.remove();
      if (exitBtnTimeout) {
        clearTimeout(exitBtnTimeout);
        exitBtnTimeout = null;
      }
      return;
    }

    if (existingBtn && existingBtn.parentElement === fsEl) {
      return;
    }

    if (existingBtn) existingBtn.remove();

    const btn = document.createElement('button');
    btn.id = 'wa-fullscreen-exit-button';
    btn.className = 'wa-fullscreen-exit-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Exit full screen');
    btn.setAttribute('title', 'Exit full screen (Esc)');
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z"/>
    </svg>`;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.exitFullscreen().catch(() => {});
    });

    const resetIdleTimer = () => {
      btn.style.opacity = '1';
      if (exitBtnTimeout) clearTimeout(exitBtnTimeout);
      exitBtnTimeout = setTimeout(() => {
        if (document.fullscreenElement) {
          btn.style.opacity = '0.35';
        }
      }, 2500);
    };

    fsEl.addEventListener('mousemove', resetIdleTimer);
    resetIdleTimer();

    fsEl.addEventListener('dblclick', (e) => {
      if (!e.target.closest('button, input, [role="button"], [role="slider"]')) {
        e.preventDefault();
        e.stopPropagation();
        document.exitFullscreen().catch(() => {});
      }
    });

    fsEl.appendChild(btn);
  }

  document.addEventListener('fullscreenchange', updateFullscreenOverlay);
  document.addEventListener('webkitfullscreenchange', updateFullscreenOverlay);
}

updatePortraitState();
lockMainScreenScroll();
setupEventListeners();
setupFullscreenRecovery();
initSettings();
