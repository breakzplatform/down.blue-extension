import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sharedSrc = fs.readFileSync("src/lib/shared.js", "utf8");
const backgroundSrc = fs.readFileSync("src/background.js", "utf8");

const BUILTIN = ["bsky.app", "deer.social", "blacksky.community", "witchsky.app", "northsky.app"];
const POST = "https://deer.social/profile/alice.bsky.social/post/3l4aiybdeoo2q";
const HANDOFF = "https://down.blue/?url=" + encodeURIComponent("https://bsky.app/profile/alice.bsky.social/post/3l4aiybdeoo2q");

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
// Storage listeners do not return the rebuild promise; give queued work time to finish.
const settle = () => new Promise(resolve => setTimeout(resolve, 25));
// Values created inside the vm context have foreign prototypes; copy them into this realm.
const plain = value => (value === undefined ? value : JSON.parse(JSON.stringify(value)));

function makeEvent() {
  const listeners = [];
  return {
    listeners,
    addListener: fn => listeners.push(fn),
    fire: (...args) => listeners.map(fn => fn(...args))
  };
}

// Small stand-in for the subset of the WebExtension API the background script uses.
// removeAll and create answer asynchronously, like the real APIs, so interleaved
// rebuilds can be observed.
function makeApi({ customDomains, granted = [], registered = [], contextPost = null } = {}) {
  const store = customDomains === undefined ? {} : { customDomains };
  const menus = [];
  const menuErrors = [];
  const scripts = registered.map(s => ({ ...s }));
  const calls = { register: [], unregister: [], tabs: [], sendMessage: [] };

  const api = {
    action: { onClicked: makeEvent() },
    contextMenus: {
      onClicked: makeEvent(),
      removeAll(cb) {
        setTimeout(() => {
          menus.length = 0;
          cb();
        }, 0);
      },
      create(options, cb) {
        setTimeout(() => {
          if (menus.some(m => m.id === options.id)) {
            api.runtime.lastError = { message: `Cannot create item with duplicate id ${options.id}` };
            menuErrors.push(options.id);
          } else {
            menus.push(plain(options));
          }
          cb();
          api.runtime.lastError = undefined;
        }, 0);
      }
    },
    runtime: {
      lastError: undefined,
      onInstalled: makeEvent(),
      onStartup: makeEvent(),
      onMessage: makeEvent()
    },
    i18n: { getMessage: key => (key === "menuTitle" ? "Download with down.blue" : "") },
    storage: {
      local: { get: async key => (key in store ? { [key]: store[key] } : {}) },
      onChanged: makeEvent()
    },
    scripting: {
      getRegisteredContentScripts: async () => scripts.map(s => ({ ...s })),
      registerContentScripts: async list => {
        calls.register.push(...plain(list));
        scripts.push(...plain(list));
      },
      unregisterContentScripts: async ({ ids }) => {
        calls.unregister.push(...ids);
        for (const id of ids) {
          const i = scripts.findIndex(s => s.id === id);
          if (i >= 0) scripts.splice(i, 1);
        }
      }
    },
    permissions: {
      contains: async ({ origins }) => origins.every(o => granted.includes(o))
    },
    tabs: {
      create: async options => {
        calls.tabs.push(plain(options));
        return options;
      },
      sendMessage: async (tabId, message, options) => {
        calls.sendMessage.push(plain({ tabId, message, options }));
        if (contextPost instanceof Error) throw contextPost;
        return contextPost;
      }
    }
  };

  return {
    api,
    menus,
    menuErrors,
    scripts,
    calls,
    async setDomains(next) {
      store.customDomains = next;
      api.storage.onChanged.fire({ customDomains: { newValue: next } }, "local");
      await settle();
    }
  };
}

function loadBackground(options, namespace = "chrome") {
  const env = makeApi(options);
  const context = vm.createContext({ [namespace]: env.api, URL, setTimeout, console });
  vm.runInContext(sharedSrc, context);
  vm.runInContext(backgroundSrc, context);
  return env;
}

async function install(env) {
  await Promise.all(env.api.runtime.onInstalled.fire({ reason: "install" }));
}

describe("background: API namespace", () => {
  it("uses browser.* when present (Firefox)", async () => {
    const env = loadBackground({}, "browser");
    assert.equal(env.api.action.onClicked.listeners.length, 1);
    await install(env);
    assert.equal(env.menus.length, 3);
  });

  it("registers every listener exactly once", () => {
    const { api } = loadBackground();
    for (const event of [
      api.action.onClicked, api.contextMenus.onClicked, api.runtime.onInstalled,
      api.runtime.onStartup, api.runtime.onMessage, api.storage.onChanged
    ]) {
      assert.equal(event.listeners.length, 1);
    }
  });
});

describe("background: context menu rebuild", () => {
  it("creates link, video and page items for the built-in sites", async () => {
    const env = loadBackground();
    await install(env);
    assert.deepEqual(env.menus.map(m => m.id), ["db-link", "db-video", "db-page"]);

    const [link, video, page] = env.menus;
    assert.deepEqual(link.contexts, ["link"]);
    assert.deepEqual(link.targetUrlPatterns, ["*://*/profile/*/post/*"]);
    assert.deepEqual(video.contexts, ["video"]);
    assert.deepEqual(video.documentUrlPatterns, BUILTIN.map(d => `https://${d}/*`));
    assert.deepEqual(page.contexts, ["page"]);
    assert.deepEqual(page.documentUrlPatterns, BUILTIN.map(d => `https://${d}/profile/*/post/*`));
    for (const item of env.menus) assert.equal(item.title, "Download with down.blue");
  });

  it("includes custom domains in the document patterns", async () => {
    const env = loadBackground({ customDomains: ["example.social"] });
    await install(env);
    const video = env.menus.find(m => m.id === "db-video");
    const page = env.menus.find(m => m.id === "db-page");
    assert.ok(video.documentUrlPatterns.includes("https://example.social/*"));
    assert.ok(page.documentUrlPatterns.includes("https://example.social/profile/*/post/*"));
  });

  it("rebuilds when customDomains changes", async () => {
    const env = loadBackground({ customDomains: [] });
    await install(env);
    await env.setDomains(["example.social"]);
    assert.equal(env.menus.length, 3);
    assert.ok(env.menus.find(m => m.id === "db-video").documentUrlPatterns.includes("https://example.social/*"));

    await env.setDomains([]);
    assert.ok(!env.menus.find(m => m.id === "db-video").documentUrlPatterns.includes("https://example.social/*"));
  });

  it("ignores unrelated storage changes", async () => {
    const env = loadBackground();
    const results = env.api.storage.onChanged.fire({ theme: { newValue: "dark" } }, "local");
    const syncResults = env.api.storage.onChanged.fire({ customDomains: { newValue: [] } }, "sync");
    assert.deepEqual([...results, ...syncResults], [undefined, undefined]);
    await tick();
    assert.equal(env.menus.length, 0);
  });

  it("does not create duplicate items when rebuilds overlap", async () => {
    const env = loadBackground({ customDomains: [] });
    const pending = [
      ...env.api.runtime.onInstalled.fire({ reason: "install" }),
      ...env.api.runtime.onStartup.fire(),
      env.setDomains(["example.social"])
    ];
    await Promise.all(pending);
    assert.deepEqual(env.menuErrors, []);
    assert.deepEqual(env.menus.map(m => m.id), ["db-link", "db-video", "db-page"]);
    assert.ok(env.menus[1].documentUrlPatterns.includes("https://example.social/*"));
  });
});

describe("background: dynamic content-script registration", () => {
  const script = domain => ({
    id: `custom-${domain}`,
    matches: [`https://${domain}/*`],
    js: ["src/lib/shared.js", "src/content/content.js"],
    css: ["src/content/content.css"],
    runAt: "document_idle",
    allFrames: false,
    persistAcrossSessions: true
  });

  it("registers a script for each granted custom domain", async () => {
    const env = loadBackground({
      customDomains: ["example.social", "other.example"],
      granted: ["https://example.social/*", "https://other.example/*"]
    });
    await install(env);
    assert.deepEqual(env.calls.register, [script("example.social"), script("other.example")]);
  });

  it("uses the same files as the static content script", async () => {
    const manifest = JSON.parse(fs.readFileSync("manifest.base.json", "utf8"));
    const env = loadBackground({ customDomains: ["example.social"], granted: ["https://example.social/*"] });
    await install(env);
    const [registered] = env.calls.register;
    assert.deepEqual(registered.js, manifest.content_scripts[0].js);
    assert.deepEqual(registered.css, manifest.content_scripts[0].css);
    assert.equal(registered.runAt, manifest.content_scripts[0].run_at);
    assert.equal(registered.allFrames, manifest.content_scripts[0].all_frames);
  });

  it("skips domains whose host permission was not granted", async () => {
    const env = loadBackground({ customDomains: ["example.social", "denied.example"], granted: ["https://example.social/*"] });
    await install(env);
    assert.deepEqual(env.calls.register.map(s => s.id), ["custom-example.social"]);
  });

  it("does nothing without custom domains", async () => {
    const env = loadBackground();
    await install(env);
    assert.deepEqual(env.calls.register, []);
    assert.deepEqual(env.calls.unregister, []);
  });

  it("does not re-register scripts that already exist", async () => {
    const env = loadBackground({
      customDomains: ["example.social"],
      granted: ["https://example.social/*"],
      registered: [script("example.social")]
    });
    await install(env);
    assert.deepEqual(env.calls.register, []);
    assert.deepEqual(env.calls.unregister, []);
  });

  it("unregisters scripts for removed domains and leaves foreign ids alone", async () => {
    const env = loadBackground({
      customDomains: ["keep.example"],
      granted: ["https://keep.example/*"],
      registered: [script("keep.example"), script("gone.example"), { id: "something-else" }]
    });
    await install(env);
    assert.deepEqual(env.calls.unregister, ["custom-gone.example"]);
    assert.deepEqual(env.scripts.map(s => s.id).sort(), ["custom-keep.example", "something-else"]);
  });

  it("follows additions and removals in storage", async () => {
    const env = loadBackground({ customDomains: [], granted: ["https://example.social/*"] });
    await install(env);
    await env.setDomains(["example.social"]);
    assert.deepEqual(env.scripts.map(s => s.id), ["custom-example.social"]);
    await env.setDomains([]);
    assert.deepEqual(env.scripts, []);
  });

  it("keeps working when the scripting API rejects", async () => {
    const env = loadBackground({ customDomains: ["example.social"], granted: ["https://example.social/*"] });
    env.api.scripting.getRegisteredContentScripts = async () => { throw new Error("boom"); };
    env.api.scripting.registerContentScripts = async () => { throw new Error("boom"); };
    await install(env);
    assert.equal(env.menus.length, 3);
  });

  it("is skipped when scripting.registerContentScripts is unavailable", async () => {
    const env = loadBackground({ customDomains: ["example.social"], granted: ["https://example.social/*"] });
    delete env.api.scripting.registerContentScripts;
    await install(env);
    assert.deepEqual(env.calls.register, []);
    assert.equal(env.menus.length, 3);
  });
});

describe("background: handoff", () => {
  const tab = { id: 7, index: 2, url: POST };

  it("toolbar action on a post opens the handoff next to the tab", () => {
    const env = loadBackground();
    env.api.action.onClicked.fire(tab);
    assert.deepEqual(env.calls.tabs, [{ url: HANDOFF, index: 3, openerTabId: 7 }]);
  });

  it("toolbar action elsewhere opens down.blue", () => {
    const env = loadBackground();
    env.api.action.onClicked.fire({ ...tab, url: "https://example.com/" });
    assert.deepEqual(env.calls.tabs, [{ url: "https://down.blue/", index: 3 }]);
  });

  it("toolbar action without a readable URL does nothing", () => {
    const env = loadBackground();
    env.api.action.onClicked.fire({ id: 7, index: 2 });
    assert.deepEqual(env.calls.tabs, []);
  });

  it("link menu uses the link URL", async () => {
    const env = loadBackground();
    await Promise.all(env.api.contextMenus.onClicked.fire({ menuItemId: "db-link", linkUrl: POST, pageUrl: "https://bsky.app/" }, tab));
    assert.deepEqual(env.calls.tabs, [{ url: HANDOFF, index: 3, openerTabId: 7 }]);
  });

  it("page menu uses the page URL", async () => {
    const env = loadBackground();
    await Promise.all(env.api.contextMenus.onClicked.fire({ menuItemId: "db-page", pageUrl: POST }, tab));
    assert.deepEqual(env.calls.tabs, [{ url: HANDOFF, index: 3, openerTabId: 7 }]);
  });

  it("video menu asks the content script for the post under the cursor", async () => {
    const env = loadBackground({ contextPost: POST });
    await Promise.all(env.api.contextMenus.onClicked.fire({ menuItemId: "db-video", pageUrl: "https://bsky.app/", frameId: 0 }, tab));
    assert.deepEqual(env.calls.sendMessage, [{ tabId: 7, message: { type: "get-context-post" }, options: { frameId: 0 } }]);
    assert.deepEqual(env.calls.tabs, [{ url: HANDOFF, index: 3, openerTabId: 7 }]);
  });

  it("video menu falls back to the page URL", async () => {
    const env = loadBackground({ contextPost: new Error("no receiver") });
    await Promise.all(env.api.contextMenus.onClicked.fire({ menuItemId: "db-video", pageUrl: POST, frameId: 0 }, tab));
    assert.deepEqual(env.calls.tabs, [{ url: HANDOFF, index: 3, openerTabId: 7 }]);
  });

  it("menu click on a non-post opens nothing", async () => {
    const env = loadBackground();
    await Promise.all(env.api.contextMenus.onClicked.fire({ menuItemId: "db-page", pageUrl: "https://bsky.app/profile/alice" }, tab));
    assert.deepEqual(env.calls.tabs, []);
  });

  it("content-script message opens the handoff", () => {
    const env = loadBackground();
    env.api.runtime.onMessage.fire({ type: "open", url: POST }, { tab }, () => {});
    assert.deepEqual(env.calls.tabs, [{ url: HANDOFF, index: 3, openerTabId: 7 }]);
  });

  it("ignores other messages and invalid URLs", () => {
    const env = loadBackground();
    env.api.runtime.onMessage.fire({ type: "other", url: POST }, { tab }, () => {});
    env.api.runtime.onMessage.fire({ type: "open", url: "https://evil.example/phish" }, { tab }, () => {});
    env.api.runtime.onMessage.fire(null, { tab }, () => {});
    assert.deepEqual(env.calls.tabs, []);
  });
});
