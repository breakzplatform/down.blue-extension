import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { buildManifest } from "./manifest.mjs";

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
  
  const manifest = buildManifest(browser);
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
