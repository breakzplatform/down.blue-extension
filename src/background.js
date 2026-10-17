try {
  if (typeof importScripts === 'function') {
    importScripts('lib/shared.js');
  }
} catch (e) {}

const api = globalThis.browser ?? globalThis.chrome;

function handleActionClick(tab) {
  if (!tab || !tab.url) return;
  try {
    const { url } = globalThis.DownBlue.parsePostUrl(tab.url);
    const handoff = globalThis.DownBlue.buildHandoffUrl(url);
    if (api.tabs.create) {
      api.tabs.create({ url: handoff, index: tab.index + 1, openerTabId: tab.id });
    }
  } catch {
    if (api.tabs.create) {
      api.tabs.create({ url: "https://down.blue/", index: tab.index + 1 });
    }
  }
}
api.action.onClicked.addListener(handleActionClick);

function createMenu(options) {
  return new Promise((resolve) => {
    api.contextMenus.create(options, () => {
      const err = api.runtime.lastError;
      resolve(err);
    });
  });
}

async function setupContextMenus() {
  await new Promise(r => api.contextMenus.removeAll(r));
  
  const title = api.i18n.getMessage("menuTitle");
  
  await createMenu({
    id: "db-link",
    title,
    contexts: ["link"],
    targetUrlPatterns: ["*://*/profile/*/post/*"]
  });

  const storage = await api.storage.local.get("customDomains");
  const customDomains = storage.customDomains || [];
  const allDomains = [...globalThis.DownBlue.BUILTIN_DOMAINS, ...customDomains];
  
  const docPatterns = allDomains.map(d => `https://${d}/*`);
  if (docPatterns.length > 0) {
    await createMenu({
      id: "db-video",
      title,
      contexts: ["video"],
      documentUrlPatterns: docPatterns
    });
  }
  
  const pagePatterns = allDomains.map(d => `https://${d}/profile/*/post/*`);
  if (pagePatterns.length > 0) {
    await createMenu({
      id: "db-page",
      title,
      contexts: ["page"],
      documentUrlPatterns: pagePatterns
    });
  }
}

async function handleMenuClick(info, tab) {
  let urlStr = "";
  if (info.menuItemId === "db-link") {
    urlStr = info.linkUrl;
  } else if (info.menuItemId === "db-page") {
    urlStr = info.pageUrl;
  } else if (info.menuItemId === "db-video") {
    try {
      const resp = await api.tabs.sendMessage(tab.id, { type: "get-context-post" }, { frameId: info.frameId });
      urlStr = resp || info.pageUrl;
    } catch {
      urlStr = info.pageUrl;
    }
  }

  try {
    const { url } = globalThis.DownBlue.parsePostUrl(urlStr);
    const handoff = globalThis.DownBlue.buildHandoffUrl(url);
    await api.tabs.create({ url: handoff, index: tab.index + 1, openerTabId: tab.id });
  } catch {
    // skip
  }
}
api.contextMenus.onClicked.addListener(handleMenuClick);

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "open" && message.url) {
    try {
      const { url } = globalThis.DownBlue.parsePostUrl(message.url);
      const handoff = globalThis.DownBlue.buildHandoffUrl(url);
      api.tabs.create({ url: handoff, index: sender.tab.index + 1, openerTabId: sender.tab.id });
    } catch {
      // skip
    }
  }
});

async function syncContentScripts() {
  if (!api.scripting || !api.scripting.registerContentScripts) return;
  const storage = await api.storage.local.get("customDomains");
  const customDomains = storage.customDomains || [];
  
  let registered = [];
  try {
    registered = await api.scripting.getRegisteredContentScripts();
  } catch {
    // skip
  }
  
  const registeredIds = registered.map(s => s.id);
  const neededIds = customDomains.map(d => `custom-${d}`);
  
  const toUnregister = registeredIds.filter(id => id.startsWith("custom-") && !neededIds.includes(id));
  if (toUnregister.length > 0) {
    try {
      await api.scripting.unregisterContentScripts({ ids: toUnregister });
    } catch {}
  }

  for (const domain of customDomains) {
    const id = `custom-${domain}`;
    if (!registeredIds.includes(id)) {
      try {
        const hasPerm = await api.permissions.contains({ origins: [`https://${domain}/*`] });
        if (hasPerm) {
          await api.scripting.registerContentScripts([{
            id,
            matches: [`https://${domain}/*`],
            js: ["src/lib/shared.js", "src/content/content.js"],
            css: ["src/content/content.css"],
            runAt: "document_idle",
            allFrames: false,
            persistAcrossSessions: true
          }]);
        }
      } catch {}
    }
  }
}

// Rebuilds are serialized: onInstalled, onStartup and storage changes can
// fire close together, and overlapping removeAll/create calls would race and
// leave duplicate-id errors behind.
let refreshQueue = Promise.resolve();
function refresh() {
  refreshQueue = refreshQueue
    .then(() => Promise.all([setupContextMenus(), syncContentScripts()]))
    .catch(() => {});
  return refreshQueue;
}

api.runtime.onInstalled.addListener(refresh);
api.runtime.onStartup.addListener(refresh);

api.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && "customDomains" in changes) {
    refresh();
  }
});
