// Renders the 1280x800 store screenshots and the Chrome Web Store promo
// images (440x280 small tile, 1400x560 marquee) into docs/store/screenshots/.
//
//   npm run screenshots
//
// Pages are served from this repository under a reserved .invalid origin
// through Playwright request interception; every other request is aborted,
// so nothing is fetched from the network. The real content script, styles,
// options page and locale files are used, with a small stub standing in for
// the extension APIs.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

const ORIGIN = "https://store-fixture.invalid";
const OUT_DIR = "docs/store/screenshots";
const VIEWPORT = { width: 1280, height: 800 };
const LANGS = ["en", "pt_BR"];

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    // Started through `npx -p playwright@x node ...`: the package is not on the
    // module path, but its CLI is on PATH. Resolve the package from there.
    const bin = fs.realpathSync(execSync("command -v playwright", { encoding: "utf8", shell: "/bin/sh" }).trim());
    const require = createRequire(bin);
    return require(path.dirname(bin));
  }
}

function readMessages(lang) {
  return JSON.parse(fs.readFileSync(`_locales/${lang}/messages.json`, "utf8"));
}

// Runs in the page before any of its scripts.
function installApiStub({ messages, seed }) {
  const store = { ...seed };
  const changeListeners = [];
  const event = (list = []) => ({
    addListener: fn => list.push(fn),
    removeListener: fn => list.splice(list.indexOf(fn) >>> 0, 1)
  });
  const pick = keys => {
    if (keys == null) return { ...store };
    const list = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
    const out = {};
    for (const k of list) if (k in store) out[k] = store[k];
    return out;
  };
  const api = {
    i18n: { getMessage: key => (messages[key] ? messages[key].message : "") },
    storage: {
      local: {
        get: async keys => pick(keys),
        set: async values => {
          const changes = {};
          for (const [k, v] of Object.entries(values)) {
            changes[k] = { oldValue: store[k], newValue: v };
            store[k] = v;
          }
          for (const fn of changeListeners) fn(changes, "local");
        }
      },
      onChanged: event(changeListeners)
    },
    runtime: { sendMessage: async () => undefined, onMessage: event() },
    permissions: {
      request: async () => true,
      remove: async () => true,
      contains: async () => true
    }
  };
  Object.defineProperty(window, "chrome", { value: api, configurable: true, writable: true });
}

async function serveRepository(context) {
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) {
      await route.abort();
      return;
    }
    const file = path.resolve("." + decodeURIComponent(url.pathname));
    if (!file.startsWith(process.cwd() + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      await route.fulfill({ status: 404, body: "not found" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: TYPES[path.extname(file)] || "application/octet-stream",
      body: fs.readFileSync(file)
    });
  });
}

async function newPage(browser, lang, seed) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: lang === "pt_BR" ? "pt-BR" : "en-US",
    colorScheme: "light",
    reducedMotion: "reduce"
  });
  await serveRepository(context);
  await context.addInitScript(installApiStub, { messages: readMessages(lang), seed });
  return { context, page: await context.newPage() };
}

async function feedScene(browser, lang, scene, file) {
  const { context, page } = await newPage(browser, lang, { footerAllPosts: false });
  await page.goto(`${ORIGIN}/docs/store/fixture/feed.html?scene=${scene}&lang=${lang}`);
  // Inject exactly what the manifest injects, in the same order.
  await page.addStyleTag({ path: "src/content/content.css" });
  await page.addScriptTag({ path: "src/lib/shared.js" });
  await page.addScriptTag({ path: "src/content/content.js" });
  await page.waitForSelector('[data-down-blue="footer"]');
  await page.waitForSelector('[data-down-blue="player"]', { state: "attached" });
  // Reveal the player button the way a pointer would.
  await page.hover("#video", { position: { x: 200, y: 120 } });
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  await context.close();
}

async function optionsScene(browser, lang, file) {
  const { context, page } = await newPage(browser, lang, {
    customDomains: ["social.example"],
    footerAllPosts: false,
    theme: "light"
  });
  await page.goto(`${ORIGIN}/src/options/options.html`);
  await page.waitForSelector("#custom-list li");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  await context.close();
}

const PROMO_SIZES = {
  small: { width: 440, height: 280 },
  marquee: { width: 1400, height: 560 }
};

async function promoScene(browser, lang, size, file) {
  const context = await browser.newContext({
    viewport: PROMO_SIZES[size],
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce"
  });
  await serveRepository(context);
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/docs/store/fixture/promo.html?size=${size}&lang=${lang}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  await context.close();
}

const { chromium } = await loadPlaywright();
const executablePath = process.env.CHROMIUM_PATH || undefined;
const browser = await chromium.launch({ executablePath });
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const lang of LANGS) {
  const prefix = path.join(OUT_DIR, lang);
  await feedScene(browser, lang, "buttons", `${prefix}-1-buttons.png`);
  await feedScene(browser, lang, "menu", `${prefix}-2-context-menu.png`);
  await optionsScene(browser, lang, `${prefix}-3-options.png`);
  await promoScene(browser, lang, "small", `${prefix}-promo-440x280.png`);
  await promoScene(browser, lang, "marquee", `${prefix}-marquee-1400x560.png`);
}

await browser.close();
console.log(`Wrote ${LANGS.length * 5} images to ${OUT_DIR}/`);
