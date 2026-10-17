import fs from "node:fs";
import vm from "node:vm";

export function loadShared() {
  const sharedSrc = fs.readFileSync("src/lib/shared.js", "utf8");
  const sandbox = {
    globalThis: {},
    URL: global.URL,
    decodeURIComponent: global.decodeURIComponent,
    encodeURIComponent: global.encodeURIComponent,
    Error: global.Error,
    String: global.String,
    console: global.console
  };
  vm.createContext(sandbox);
  vm.runInContext(sharedSrc, sandbox);
  const shared = sandbox.globalThis.DownBlue;
  // copy into this realm so callers get plain arrays
  return { ...shared, BUILTIN_DOMAINS: Array.from(shared.BUILTIN_DOMAINS) };
}

export function buildManifest(browser) {
  const { BUILTIN_DOMAINS } = loadShared();
  const manifest = JSON.parse(fs.readFileSync("manifest.base.json", "utf8"));
  manifest.host_permissions = BUILTIN_DOMAINS.map(d => `https://${d}/*`);
  manifest.content_scripts[0].matches = BUILTIN_DOMAINS.map(d => `https://${d}/*`);

  if (browser === "chrome") {
    manifest.background = { service_worker: "src/background.js" };
  } else if (browser === "firefox") {
    manifest.background = { scripts: ["src/lib/shared.js", "src/background.js"] };
    manifest.browser_specific_settings = {
      gecko: {
        id: "extension@down.blue",
        // 140 is the first release (and ESR) that understands data_collection_permissions
        strict_min_version: "140.0",
        data_collection_permissions: { required: ["none"] }
      },
      gecko_android: {
        strict_min_version: "142.0"
      }
    };
  } else {
    throw new Error(`Unknown browser: ${browser}`);
  }
  return manifest;
}
