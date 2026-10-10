const SELECTORS = Object.freeze({
  // Post page or thread item
  postContainer: '[data-testid^="postThreadItem-by-"], [data-testid^="feedItem-by-"]',
  // Footer wrappers (div parent of these buttons)
  shareBtn: '[data-testid="postShareBtn"], [data-testid="shareBtn"]',
  // Video embed wrapper
  playerWrapperLabel: '[aria-label="Embedded video player"]',
  // Media embeds
  mediaLinks: 'a[href*="tenor.com"], a[href*="giphy.com"], img[src*="tenor.com"], img[src*="giphy.com"], video'
});

const api = globalThis.browser ?? globalThis.chrome;

let footerAllPosts = false;
let lastContextPost = null;
let scanScheduled = false;

function isMediaContainer(el) {
  return el.querySelector(SELECTORS.mediaLinks) !== null;
}

function getPostUrlFromContainer(container) {
  const permalinks = Array.from(container.querySelectorAll('a[href]'));
  for (const a of permalinks) {
    const url = a.getAttribute('href');
    if (url && /^\/profile\/[^/]+\/post\/[^/]+$/.test(url)) {
      return new URL(url, location.origin).href;
    }
  }
  
  if (container.getAttribute('data-testid')?.startsWith('postThreadItem-by-')) {
    const allThreads = document.querySelectorAll('[data-testid^="postThreadItem-by-"]');
    if (allThreads[0] === container) {
      const pathname = location.pathname;
      if (/^\/profile\/[^/]+\/post\/[^/]+$/.test(pathname)) {
        return location.origin + pathname;
      }
    }
  }
  return null;
}

function createFooterButton(shareWrapper) {
  const btnDiv = shareWrapper.cloneNode(false);
  btnDiv.setAttribute('data-down-blue', 'footer');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'db-footer-btn';
  btn.setAttribute('aria-label', api.i18n.getMessage('buttonTitle'));
  btn.setAttribute('title', api.i18n.getMessage('buttonTitle'));
  
  const iconNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(iconNS, "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "square");
  
  const p1 = document.createElementNS(iconNS, "path");
  p1.setAttribute("d", "M12 15V3");
  const p2 = document.createElementNS(iconNS, "path");
  p2.setAttribute("d", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4");
  const p3 = document.createElementNS(iconNS, "path");
  p3.setAttribute("d", "m7 10 5 5 5-5");
  
  svg.appendChild(p1);
  svg.appendChild(p2);
  svg.appendChild(p3);
  
  btn.appendChild(svg);
  btnDiv.appendChild(btn);
  
  try {
    const shareBtn = shareWrapper.querySelector('button') || shareWrapper.firstElementChild;
    if (shareBtn) {
      const color = getComputedStyle(shareBtn).color;
      btn.style.setProperty('--db-footer-color', color);
    }
  } catch {}
  
  return btnDiv;
}

function scan() {
  scanScheduled = false;
  
  const containers = document.querySelectorAll(SELECTORS.postContainer);
  for (const container of containers) {
    try {
      const shareBtn = container.querySelector(SELECTORS.shareBtn);
      if (shareBtn) {
        const shareWrapper = shareBtn.parentElement;
        if (shareWrapper && shareWrapper.parentElement) {
          const row = shareWrapper.parentElement;
          let existing = row.querySelector('[data-down-blue="footer"]');
          const shouldInject = footerAllPosts || isMediaContainer(container);
          
          if (shouldInject && !existing) {
            const newBtn = createFooterButton(shareWrapper);
            shareWrapper.after(newBtn);
          } else if (!shouldInject && existing) {
            existing.remove();
          }
        }
      }
      
      const videos = container.querySelectorAll('video');
      for (const video of videos) {
        let playerWrapper = video.closest(SELECTORS.playerWrapperLabel);
        if (!playerWrapper) playerWrapper = video.closest('figure')?.parentElement;
        if (!playerWrapper) playerWrapper = video.parentElement;
        
        if (playerWrapper && !playerWrapper.querySelector('[data-down-blue="player"]')) {
          if (getComputedStyle(playerWrapper).position === 'static') {
            playerWrapper.classList.add('db-position-relative');
          }
          
          const pBtn = document.createElement('button');
          pBtn.type = 'button';
          pBtn.className = 'db-player-btn';
          pBtn.setAttribute('data-down-blue', 'player');
          pBtn.setAttribute('aria-label', api.i18n.getMessage('buttonTitle'));
          pBtn.setAttribute('title', api.i18n.getMessage('buttonTitle'));
          
          const iconNS = "http://www.w3.org/2000/svg";
          const svg = document.createElementNS(iconNS, "svg");
          svg.setAttribute("width", "16");
          svg.setAttribute("height", "16");
          svg.setAttribute("viewBox", "0 0 24 24");
          svg.setAttribute("fill", "none");
          svg.setAttribute("stroke", "currentColor");
          svg.setAttribute("stroke-width", "2");
          svg.setAttribute("stroke-linecap", "square");
          const p1 = document.createElementNS(iconNS, "path");
          p1.setAttribute("d", "M12 15V3");
          const p2 = document.createElementNS(iconNS, "path");
          p2.setAttribute("d", "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4");
          const p3 = document.createElementNS(iconNS, "path");
          p3.setAttribute("d", "m7 10 5 5 5-5");
          svg.appendChild(p1);
          svg.appendChild(p2);
          svg.appendChild(p3);
          
          pBtn.appendChild(svg);
          playerWrapper.appendChild(pBtn);
        }
      }
    } catch (err) {}
  }
}

function requestScan() {
  if (!scanScheduled) {
    scanScheduled = true;
    requestAnimationFrame(scan);
  }
}

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.target && m.target.nodeType === 1 && m.target.hasAttribute?.('data-down-blue')) {
      continue;
    }
    requestScan();
    return;
  }
});
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('popstate', requestScan);

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-down-blue]');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    
    const container = btn.closest(SELECTORS.postContainer);
    if (container) {
      const url = getPostUrlFromContainer(container);
      if (url) {
        api.runtime.sendMessage({ type: "open", url });
      }
    }
  }
}, { capture: true });

// prevent player toggling when interacting with the button
['pointerdown', 'mousedown', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, (e) => {
    if (e.target.closest('[data-down-blue="player"]')) {
      e.stopPropagation();
    }
  }, { capture: true });
});

document.addEventListener('contextmenu', (e) => {
  const container = e.target.closest(SELECTORS.postContainer);
  if (container) {
    lastContextPost = getPostUrlFromContainer(container);
  } else {
    lastContextPost = null;
  }
}, { capture: true, passive: true });

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "get-context-post") {
    sendResponse(lastContextPost);
  }
});

function loadConfig() {
  api.storage.local.get("footerAllPosts").then(res => {
    footerAllPosts = !!res.footerAllPosts;
    requestScan();
  });
}
loadConfig();
api.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.footerAllPosts !== undefined) {
    footerAllPosts = !!changes.footerAllPosts.newValue;
    requestScan();
  }
});
