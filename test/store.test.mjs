// Keeps docs/store in agreement with the manifest, locales and assets.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildManifest, loadShared } from "../scripts/manifest.mjs";

const STORE = "docs/store";
const readme = fs.readFileSync(`${STORE}/README.md`, "utf8");
const submission = fs.readFileSync(`${STORE}/SUBMISSION.md`, "utf8");
const privacy = fs.readFileSync(`${STORE}/privacy.md`, "utf8");
const base = JSON.parse(fs.readFileSync("manifest.base.json", "utf8"));
const { BUILTIN_DOMAINS } = loadShared();

function codeBlockAfter(markdown, heading) {
  const start = markdown.indexOf(heading);
  assert.ok(start >= 0, `missing heading ${heading}`);
  const match = markdown.slice(start).match(/```\n([\s\S]*?)\n```/);
  assert.ok(match, `no code block after ${heading}`);
  return match[1];
}

function pngInfo(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.toString("ascii", 1, 4), "PNG", `${file} is not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}

describe("store listing", () => {
  const cases = [
    ["en", "### Short description"],
    ["pt_BR", "### Descrição curta"]
  ];
  for (const [locale, heading] of cases) {
    it(`${locale} short description matches extDescription and fits 132 characters`, () => {
      const messages = JSON.parse(fs.readFileSync(`_locales/${locale}/messages.json`, "utf8"));
      const short = codeBlockAfter(readme, heading);
      assert.equal(short, messages.extDescription.message);
      assert.ok(short.length <= 132);
    });
  }

  it("long descriptions fit the CWS limit", () => {
    for (const heading of ["### Long description", "### Descrição completa"]) {
      assert.ok(codeBlockAfter(readme, heading).length <= 16000);
    }
  });

  it("states the manifest version", () => {
    assert.match(readme, new RegExp(`\\| Version \\| ${base.version.replace(/\./g, "\\.")} \\|`));
  });

  it("lists every built-in site in both languages", () => {
    for (const heading of ["### Long description", "### Descrição completa"]) {
      const text = codeBlockAfter(readme, heading);
      for (const domain of BUILTIN_DOMAINS) assert.ok(text.includes(domain), `${heading} misses ${domain}`);
    }
  });

  it("points only at screenshots that exist and are 1280x800 without alpha", () => {
    const referenced = [...readme.matchAll(/`(screenshots\/[^`]+\.png)`/g)].map(m => m[1]);
    const onDisk = fs.readdirSync(`${STORE}/screenshots`).map(f => `screenshots/${f}`);
    assert.deepEqual([...referenced].sort(), [...onDisk].sort());
    for (const file of referenced) {
      const info = pngInfo(path.join(STORE, file));
      assert.deepEqual([info.width, info.height], [1280, 800], file);
      assert.equal(info.colorType, 2, `${file} must be 24-bit RGB`);
    }
  });
});

describe("submission notes", () => {
  it("justifies exactly the manifest permissions", () => {
    const justified = [...submission.matchAll(/^### `(\w+)`$/gm)].map(m => m[1]);
    assert.deepEqual([...justified].sort(), [...base.permissions].sort());
  });

  it("covers the optional host permission", () => {
    for (const origin of base.optional_host_permissions) {
      assert.ok(submission.includes(`### Optional host permission: \`${origin}\``));
    }
  });

  it("lists the required host permissions", () => {
    for (const origin of buildManifest("chrome").host_permissions) {
      assert.ok(submission.includes(`\`${origin}\``), `missing ${origin}`);
    }
  });

  it("matches the Firefox settings", () => {
    const { gecko, gecko_android: android } = buildManifest("firefox").browser_specific_settings;
    assert.ok(submission.includes(`gecko.id: ${gecko.id}`));
    assert.ok(submission.includes(`strict_min_version: ${gecko.strict_min_version}`));
    assert.ok(submission.includes(`gecko_android.strict_min_version: ${android.strict_min_version}`));
    assert.ok(submission.includes(`data_collection_permissions.required: ${JSON.stringify(gecko.data_collection_permissions.required)}`));
  });
});

describe("privacy policy", () => {
  it("has both languages", () => {
    assert.ok(privacy.includes("## English"));
    assert.ok(privacy.includes("## Português (Brasil)"));
  });

  it("names every built-in site in both languages", () => {
    for (const domain of BUILTIN_DOMAINS) {
      assert.ok(privacy.split(domain).length - 1 >= 2, `${domain} should appear in both languages`);
    }
  });

  it("names every stored setting the code uses", () => {
    const sources = ["src/background.js", "src/content/content.js", "src/options/options.js"]
      .map(f => fs.readFileSync(f, "utf8")).join("\n");
    const keys = new Set([...sources.matchAll(/storage\.local\.(?:get|set)\(\s*(?:"(\w+)"|\{\s*(\w+):)/g)].map(m => m[1] || m[2]));
    assert.deepEqual([...keys].sort(), ["customDomains", "footerAllPosts", "theme"]);
    for (const key of keys) assert.ok(submission.includes(`\`${key}\``), `SUBMISSION.md misses ${key}`);
  });
});
