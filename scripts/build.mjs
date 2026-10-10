import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execSync } from "node:child_process";

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
const BUILTIN_DOMAINS = sandbox.globalThis.DownBlue.BUILTIN_DOMAINS;

const manifestBase = JSON.parse(fs.readFileSync("manifest.base.json", "utf8"));
manifestBase.host_permissions = BUILTIN_DOMAINS.map(d => `https://${d}/*`);
manifestBase.content_scripts[0].matches = BUILTIN_DOMAINS.map(d => `https://${d}/*`);

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function build(browser) {
  const distDir = `dist/${browser}`;
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  
  // copy files
  copyDir("src", path.join(distDir, "src"));
  copyDir("_locales", path.join(distDir, "_locales"));
  
  // build icons are in src/icons, copy them directly into icons/ inside dist
  copyDir("src/icons", path.join(distDir, "icons"));
  
  const manifest = structuredClone(manifestBase);
  if (browser === "chrome") {
    manifest.background = { service_worker: "src/background.js" };
  } else if (browser === "firefox") {
    manifest.background = { scripts: ["src/lib/shared.js", "src/background.js"] };
    manifest.browser_specific_settings = {
      gecko: {
        id: "extension@down.blue",
        strict_min_version: "128.0",
        data_collection_permissions: { required: ["none"] }
      }
    };
  }
  
  fs.writeFileSync(path.join(distDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  
  // zip
  const zipFile = `dist/down.blue-${browser}.zip`;
  if (fs.existsSync(zipFile)) {
    fs.rmSync(zipFile);
  }
  execSync(`zip -r ../down.blue-${browser}.zip .`, { cwd: distDir });
}

fs.mkdirSync("dist", { recursive: true });
build("chrome");
build("firefox");
