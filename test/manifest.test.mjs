import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildManifest, loadShared } from "../scripts/manifest.mjs";

const { BUILTIN_DOMAINS } = loadShared();
const PERMISSIONS = ["contextMenus", "activeTab", "storage", "scripting"];
const BROWSERS = ["chrome", "firefox"];

// Map a path inside the built package back to the source tree (see scripts/build.mjs).
function sourcePath(packagePath) {
  return packagePath.startsWith("icons/") ? path.join("src", packagePath) : packagePath;
}

function readLocale(locale) {
  return JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`, "utf8"));
}

for (const browser of BROWSERS) {
  describe(`${browser} manifest`, () => {
    const manifest = buildManifest(browser);

    it("is Manifest V3 with a semver version", () => {
      assert.equal(manifest.manifest_version, 3);
      assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
      assert.equal(manifest.default_locale, "en");
    });

    it("requests exactly the four permissions", () => {
      assert.deepEqual([...manifest.permissions].sort(), [...PERMISSIONS].sort());
      assert.equal(manifest.permissions.length, PERMISSIONS.length);
    });

    it("limits required host access to the built-in sites", () => {
      assert.deepEqual(manifest.host_permissions, BUILTIN_DOMAINS.map(d => `https://${d}/*`));
      assert.deepEqual(manifest.content_scripts.length, 1);
      assert.deepEqual(manifest.content_scripts[0].matches, manifest.host_permissions);
    });

    it("keeps broad host access optional", () => {
      assert.deepEqual(manifest.optional_host_permissions, ["https://*/*"]);
      assert.ok(!manifest.permissions.some(p => p.includes("://") || p === "<all_urls>"));
      assert.ok(!manifest.host_permissions.includes("https://*/*"));
    });

    it("references only files that exist", () => {
      const files = [
        ...Object.values(manifest.icons),
        ...Object.values(manifest.action.default_icon),
        ...manifest.content_scripts.flatMap(cs => [...cs.js, ...cs.css]),
        manifest.options_ui.page,
        ...(manifest.background.scripts || []),
        ...(manifest.background.service_worker ? [manifest.background.service_worker] : [])
      ];
      for (const file of files) {
        assert.ok(fs.existsSync(sourcePath(file)), `${file} is missing`);
      }
    });

    it("has no remote code or unexpected keys", () => {
      assert.equal(manifest.content_security_policy, undefined);
      assert.equal(manifest.externally_connectable, undefined);
      assert.equal(manifest.web_accessible_resources, undefined);
      assert.equal(manifest.update_url, undefined);
    });

    it("matches dist/ when a build is present", (t) => {
      const built = `dist/${browser}/manifest.json`;
      if (!fs.existsSync(built)) {
        t.skip("run npm run build first");
        return;
      }
      assert.deepEqual(JSON.parse(fs.readFileSync(built, "utf8")), manifest);
    });
  });
}

describe("browser-specific keys", () => {
  it("chrome uses a service worker and has no browser_specific_settings", () => {
    const manifest = buildManifest("chrome");
    assert.equal(manifest.browser_specific_settings, undefined);
    assert.deepEqual(manifest.background, { service_worker: "src/background.js" });
  });

  it("firefox uses background scripts and has no service_worker", () => {
    const manifest = buildManifest("firefox");
    assert.equal(manifest.background.service_worker, undefined);
    assert.deepEqual(manifest.background.scripts, ["src/lib/shared.js", "src/background.js"]);
  });

  it("firefox declares its id and that no data is collected", () => {
    const { gecko } = buildManifest("firefox").browser_specific_settings;
    assert.equal(gecko.id, "extension@down.blue");
    assert.deepEqual(gecko.data_collection_permissions, { required: ["none"] });
    assert.ok(Number.parseFloat(gecko.strict_min_version) >= 140, "data_collection_permissions needs Firefox 140");
  });

  it("chrome service worker loads shared.js itself", () => {
    const src = fs.readFileSync("src/background.js", "utf8");
    assert.match(src, /importScripts\('lib\/shared\.js'\)/);
  });
});

describe("locales", () => {
  const locales = fs.readdirSync("_locales");
  const en = readLocale("en");

  it("ships en and pt_BR", () => {
    assert.deepEqual(locales.sort(), ["en", "pt_BR"]);
  });

  for (const locale of locales) {
    it(`${locale} has the same keys as en`, () => {
      assert.deepEqual(Object.keys(readLocale(locale)).sort(), Object.keys(en).sort());
    });

    it(`${locale} has no empty messages`, () => {
      for (const [key, entry] of Object.entries(readLocale(locale))) {
        assert.equal(typeof entry.message, "string", key);
        assert.ok(entry.message.trim().length > 0, `${locale}.${key} is empty`);
      }
    });

    it(`${locale} name and description fit the store limits`, () => {
      const messages = readLocale(locale);
      assert.ok(messages.extName.message.length <= 75);
      assert.ok(messages.extDescription.message.length <= 132);
    });
  }

  it("defines every message the code and manifest use", () => {
    const used = new Set();
    const manifestText = fs.readFileSync("manifest.base.json", "utf8");
    for (const m of manifestText.matchAll(/__MSG_(\w+)__/g)) used.add(m[1]);
    for (const file of ["src/background.js", "src/content/content.js", "src/options/options.js", "src/options/options.html"]) {
      const text = fs.readFileSync(file, "utf8");
      for (const m of text.matchAll(/getMessage\(\s*["'](\w+)["']/g)) used.add(m[1]);
      for (const m of text.matchAll(/data-i18n="(\w+)"/g)) used.add(m[1]);
    }
    assert.ok(used.size > 5);
    for (const key of used) {
      assert.ok(key in en, `missing message ${key}`);
    }
  });
});
