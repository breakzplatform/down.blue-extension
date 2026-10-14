import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadShared } from "../scripts/manifest.mjs";

const DownBlue = loadShared();
const invalid = /Invalid domain/;
const builtin = /Domain is already built-in/;

describe("DownBlue.normalizeDomain: accepted input", () => {
  const cases = [
    ["example.social", "example.social"],
    ["  example.social  ", "example.social"],
    ["EXAMPLE.Social", "example.social"],
    ["https://example.social", "example.social"],
    ["http://example.social/", "example.social"],
    ["HTTPS://Example.Social/profile/alice/post/123", "example.social"],
    ["example.social:8443", "example.social"],
    ["https://example.social:443/foo", "example.social"],
    ["example.social.", "example.social"],
    ["example.social?x=1", "example.social"],
    ["example.social#top", "example.social"],
    ["example.social/../..", "example.social"],
    ["www.example.social", "www.example.social"],
    ["sub-domain.example.co.uk", "sub-domain.example.co.uk"],
    ["xn--caf-dma.example", "xn--caf-dma.example"],
    ["café.example", "xn--caf-dma.example"],
    ["123.example", "123.example"],
    ["staging.bsky.app", "staging.bsky.app"]
  ];
  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} -> ${expected}`, () => {
      assert.equal(DownBlue.normalizeDomain(input), expected);
    });
  }
});

describe("DownBlue.normalizeDomain: rejected input", () => {
  const cases = [
    "",
    "   ",
    "https://",
    "localhost",
    "LOCALHOST",
    "localhost:3000",
    "localhost.",
    "127.0.0.1",
    "127.0.0.1:8080",
    "https://192.168.0.10/",
    "10.0.0.1.",
    "1.2.3",
    "0x7f.1",
    "[::1]",
    "https://[::1]:8080/",
    "::1",
    "intranet",
    "bad example.com",
    "user@example.social",
    "https://user:pass@example.social/",
    "example..social",
    ".example.social",
    "-example.social",
    "example-.social",
    "exa_mple.social",
    "*.example.social",
    `${"a".repeat(64)}.example`,
    `${"a.".repeat(127)}example`
  ];
  for (const input of cases) {
    it(`rejects ${JSON.stringify(input)}`, () => {
      assert.throws(() => DownBlue.normalizeDomain(input), invalid);
    });
  }

  it("rejects non-strings", () => {
    for (const value of [undefined, null, 42, {}, ["example.social"]]) {
      assert.throws(() => DownBlue.normalizeDomain(value), invalid);
    }
  });
});

describe("DownBlue.normalizeDomain: built-in duplicates", () => {
  for (const domain of DownBlue.BUILTIN_DOMAINS) {
    const variants = [
      domain,
      domain.toUpperCase(),
      `https://${domain}/`,
      `http://${domain}/profile/alice/post/123`,
      `${domain}:443`,
      `${domain}.`,
      ` ${domain} `
    ];
    for (const input of variants) {
      it(`rejects ${JSON.stringify(input)} as built-in`, () => {
        assert.throws(() => DownBlue.normalizeDomain(input), builtin);
      });
    }
  }
});
