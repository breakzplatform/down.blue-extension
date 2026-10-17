# Submission notes (0.1.0)

Answers for the Chrome Web Store "Privacy practices" tab and the Firefox
Add-ons (AMO) submission form, plus the release checklist. Everything here
describes `manifest.base.json` as built by `scripts/manifest.mjs`;
`test/manifest.test.mjs` and `test/store.test.mjs` fail if the two drift apart.

## Packages

| Store | Upload | Background | Browser-specific settings |
|---|---|---|---|
| Chrome Web Store | `dist/down.blue-chrome.zip` | `service_worker: src/background.js` (loads `src/lib/shared.js` with `importScripts`) | none |
| Firefox Add-ons | `dist/down.blue-firefox.zip` | `scripts: [src/lib/shared.js, src/background.js]` | `gecko.id: extension@down.blue`, `strict_min_version: 140.0`, `data_collection_permissions.required: ["none"]`; `gecko_android.strict_min_version: 142.0` |

Both packages are built by `npm run build` from the same sources. Files are
copied as-is: no bundling, minification or transpilation, so AMO does not
need a separate source-code upload.

## Single purpose

> down.blue sends a Bluesky post to https://down.blue so the user can download
> the post's video or GIF. It does this from a button on the post, a
> right-click menu item, or the toolbar button, and it does nothing else.

## Permission justifications

### `contextMenus`

Adds one "Download with down.blue" item to the right-click menu: on links
that point to a post (`*://*/profile/*/post/*`), on videos and on post pages
of the supported sites. Choosing it opens the post on down.blue in a new tab.

### `activeTab`

When the user clicks the toolbar button, the extension reads the URL of the
current tab to find the post to send to down.blue. `activeTab` grants this
only for that tab and only after the click, so no broad tab access is needed.
If the page is not a post, the click opens https://down.blue/ instead.

### `storage`

Saves three settings in `storage.local`: the list of extra sites the user
added (`customDomains`), the options-page theme (`theme`) and whether to show
the button on every post (`footerAllPosts`). Nothing else is stored, and
nothing is synced or sent anywhere.

### `scripting`

Used only for sites the user adds on the options page: after the user grants
access to that site, `scripting.registerContentScripts` registers the same
content script that the manifest declares for the built-in sites, so the
button appears there too. When the user removes the site, the script is
unregistered and the site permission is released. `scripting.executeScript`
is not used.

### Host permissions (required)

`https://bsky.app/*`, `https://deer.social/*`, `https://blacksky.community/*`,
`https://witchsky.app/*`, `https://northsky.app/*`.

The content script runs on these five sites, the official Bluesky web client
and four forks of it, to add the download button to posts. The list is the
`BUILTIN_DOMAINS` constant in `src/lib/shared.js`.

### Optional host permission: `https://*/*`

Declared in `optional_host_permissions`, so it is never granted at install
time and no "all websites" warning is shown.

It exists because other forks of the Bluesky web client run on domains we
cannot list in advance. When the user types a site on the options page, the
extension calls `permissions.request` for that single origin
(`https://<site>/*`), never for the wildcard. The browser shows its own
prompt; if the user declines, nothing is saved. The address is validated
first (`normalizeDomain`): IP addresses, `localhost`, single-label names and
the built-in sites are rejected. Removing the site calls
`permissions.remove` for that origin.

## Remote code

No. All JavaScript is in the package. The extension does not load scripts
from the network, does not use `eval`, `new Function` or remote
WebAssembly, and declares no custom `content_security_policy`.

## Data usage

The extension collects nothing.

Chrome Web Store, "Data usage": leave every category unchecked (personally
identifiable information, health, financial and payment, authentication,
personal communications, location, web history, user activity, website
content). Certify all three statements:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

Firefox: `data_collection_permissions.required` is `["none"]` and there are no
optional data permissions.

What the extension does with a post address: when the user clicks one of the
buttons, it opens a new tab at `https://down.blue/?url=<encoded post URL>`,
for example
`https://down.blue/?url=https%3A%2F%2Fbsky.app%2Fprofile%2Falice.bsky.social%2Fpost%2F3l4aiybdeoo2q`.
This is a navigation the user asked for, not a background request. The
extension itself makes no network requests.

Privacy policy URL: see [privacy.md](privacy.md); it needs a public URL
before submission (open question in the PR).

## Notes for AMO reviewers

Paste into "Notes to Reviewer":

```
down.blue adds a "Download with down.blue" button to Bluesky posts. Clicking it opens https://down.blue/?url=<post URL> in a new tab; the download happens on that website. The extension collects no data and makes no network requests of its own.

No build tooling beyond copying files: the package contains src/, _locales/ and icons/ unchanged, plus a manifest generated from manifest.base.json (scripts/build.mjs). No minification, no bundling, no third-party libraries.

Test steps (no account needed; public posts are visible while logged out):
1. Install the add-on. Open https://bsky.app/profile/bsky.app and scroll to a post that has a video.
2. Footer button: a download icon appears in the post's action row, right after Share. Posts without a video or GIF do not get it.
3. Player button: hover the video; a square download button appears in its top-right corner.
4. Click either button. A new tab opens at https://down.blue/?url=https%3A%2F%2Fbsky.app%2Fprofile%2F...%2Fpost%2F... next to the current tab.
5. Context menu: right-click the video, then right-click the post's timestamp link. Both menus contain "Download with down.blue", which opens the same down.blue tab.
6. Toolbar: open the post itself (click its timestamp) and click the down.blue toolbar button; the down.blue tab opens. On a page that is not a post (for example https://bsky.app/), the toolbar button opens https://down.blue/.
7. Options (about:addons > down.blue > Preferences): the five built-in sites are listed. Type example.com and click "Add site": Firefox asks for access to example.com only. Accept; example.com is listed and about:addons > Permissions shows only that extra site. Click "Remove": the site and its permission are gone. Typing localhost, 127.0.0.1 or bsky.app shows an error and no prompt.
8. Option "Show the button on every post": when enabled, the footer button also appears on text-only posts.

Expected: no requests in the add-on's background console network tab during any of these steps.
```

## Release checklist

Automated (run in CI or locally):

- [x] `npm test` passes
- [x] `npm run build` writes `dist/chrome`, `dist/firefox` and both zips
- [x] `npm run lint` reports 0 errors, 0 warnings, 0 notices
- [x] Built manifests: Chrome has no `browser_specific_settings`, Firefox has no `service_worker`, permissions are exactly `contextMenus`, `activeTab`, `storage`, `scripting`
- [x] `_locales/en` and `_locales/pt_BR` have identical keys and no empty messages; descriptions are within 132 characters
- [x] Screenshots and promo images regenerated with `npm run screenshots` (1280x800, 440x280, 1400x560, 24-bit PNG)

Needs a real browser (not possible in the build environment):

- [ ] Chrome: load `dist/chrome` unpacked; no errors on chrome://extensions; steps 1-8 above pass
- [ ] Chrome: service worker restarts (stop it from chrome://extensions) and context menus still work afterwards
- [ ] Firefox 140+: load `dist/firefox/manifest.json` as a temporary add-on; steps 1-8 above pass
- [ ] Firefox: the install prompt lists only the five built-in sites, not "all websites"
- [ ] Firefox: the custom-site permission prompt and removal work as in step 7
- [ ] pt-BR UI: with the browser language set to Português (Brasil), the menu item reads "Baixar com down.blue" and the options page is translated
- [ ] Each of deer.social, blacksky.community, witchsky.app and northsky.app still matches `docs/selectors.md`
- [x] Toolbar and store icons show the download arrow at 16, 32, 48, 96 and 128 px (rendered with resvg)

Before submitting:

- [ ] Version in `manifest.base.json` matches the release
- [ ] Privacy policy published at a public URL and entered in both dashboards
- [ ] Support contact entered in both dashboards
- [ ] Listing text and screenshots from [README.md](README.md) entered for both languages
- [ ] Zip contents checked (`unzip -l dist/down.blue-*.zip`): no `.DS_Store`, no test or docs files
