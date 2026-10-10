import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

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
const DownBlue = sandbox.globalThis.DownBlue;

describe("DownBlue.parsePostUrl", () => {
  it("accepts bsky.app URL", () => {
    const res = DownBlue.parsePostUrl("https://bsky.app/profile/alice.bsky.social/post/3l4aiybdeoo2q");
    assert.equal(res.url, "https://bsky.app/profile/alice.bsky.social/post/3l4aiybdeoo2q");
  });

  it("accepts deer.social URL", () => {
    const res = DownBlue.parsePostUrl("https://deer.social/profile/bob.bsky.social/post/12345");
    assert.equal(res.url, "https://bsky.app/profile/bob.bsky.social/post/12345");
  });

  it("accepts blacksky.community URL", () => {
    const res = DownBlue.parsePostUrl("https://blacksky.community/profile/charlie/post/xyz");
    assert.equal(res.url, "https://bsky.app/profile/charlie/post/xyz");
  });

  it("accepts at:// URI", () => {
    const res = DownBlue.parsePostUrl("at://did:plc:123/app.bsky.feed.post/456");
    assert.equal(res.url, "https://bsky.app/profile/did:plc:123/post/456");
  });

  it("accepts tail segment /liked-by", () => {
    const res = DownBlue.parsePostUrl("https://bsky.app/profile/alice/post/xyz/liked-by");
    assert.equal(res.url, "https://bsky.app/profile/alice/post/xyz");
  });

  it("accepts encoded handles", () => {
    const res = DownBlue.parsePostUrl("https://bsky.app/profile/alice%2Ebsky%2Esocial/post/123");
    assert.equal(res.url, "https://bsky.app/profile/alice.bsky.social/post/123");
  });

  it("accepts DIDs", () => {
    const res = DownBlue.parsePostUrl("https://bsky.app/profile/did:plc:123/post/456");
    assert.equal(res.url, "https://bsky.app/profile/did:plc:123/post/456");
  });

  it("rejects .. in handle", () => {
    assert.throws(() => DownBlue.parsePostUrl("https://bsky.app/profile/../post/123"), /Invalid URL format/);
  });

  it("rejects non-post paths", () => {
    assert.throws(() => DownBlue.parsePostUrl("https://bsky.app/profile/alice"), /Invalid URL format/);
  });

  it("rejects ftp:", () => {
    assert.throws(() => DownBlue.parsePostUrl("ftp://bsky.app/profile/alice/post/123"), /Invalid URL/);
  });
});

describe("DownBlue.buildHandoffUrl", () => {
  it("encodes properly", () => {
    const res = DownBlue.buildHandoffUrl("https://bsky.app/profile/alice/post/123");
    assert.equal(res, "https://down.blue/?url=https%3A%2F%2Fbsky.app%2Fprofile%2Falice%2Fpost%2F123");
  });
});

describe("DownBlue.normalizeDomain", () => {
  it("strips scheme and path", () => {
    assert.equal(DownBlue.normalizeDomain("https://example.com/foo/bar"), "example.com");
  });

  it("lowercases", () => {
    assert.equal(DownBlue.normalizeDomain("Example.Com"), "example.com");
  });

  it("rejects built-in", () => {
    assert.throws(() => DownBlue.normalizeDomain("bsky.app"), /Domain is already built-in/);
  });

  it("rejects invalid domains", () => {
    assert.throws(() => DownBlue.normalizeDomain("127.0.0.1"), /Invalid domain/);
    assert.throws(() => DownBlue.normalizeDomain("localhost"), /Invalid domain/);
    assert.throws(() => DownBlue.normalizeDomain("bad example"), /Invalid domain/);
  });
});
