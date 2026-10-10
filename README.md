# down.blue-extension

A browser extension that makes downloading Bluesky videos and GIFs seamless. It adds a download button directly to posts, right-click context menus, and a toolbar action to hand off posts to [down.blue](https://down.blue/).

## Installation

### Chrome
1. Run `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/chrome` folder.

### Firefox
1. Run `npm run build`
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..." and select the `dist/firefox/manifest.json` file (or install the signed zip later).

## Supported sites

The extension supports the official Bluesky client and several verified forks out of the box:
- `bsky.app`
- `deer.social`
- `blacksky.community`
- `witchsky.app`
- `northsky.app`

### Custom Sites

If you use a different fork of the Bluesky social app, you can add it in the extension Options page. The extension requests runtime host permissions when you add a site, registering content scripts dynamically so the button appears there just like on the built-in sites.

## Permissions Explained

- `contextMenus`: Used to add "Download with down.blue" to your right-click menu.
- `activeTab`: Used to read the URL of the current tab when you click the extension's toolbar icon.
- `storage`: Used to save your settings (like custom domains, theme, and the footer button toggle).
- `scripting`: Used to inject the download buttons into the social sites you browse.

## Privacy

**Zero tracking, zero analytics.** 

The extension makes no network requests of its own. It only opens new tabs to `https://down.blue/?url=...` handing off the URL for processing. Nothing is collected.

## Handoff

The extension extracts the user's handle and the post ID and forwards it securely via `?url=` to down.blue.

## Development

- `npm run build` — Builds both Chrome and Firefox targets to `dist/` and zips them.
- `npm run test` — Runs unit tests using Node's native runner.
- `npm run lint` — Lints the Firefox build via `web-ext`.

See [Selectors documentation](docs/selectors.md) for details on DOM integration.

## Support

If you'd like to support the project:
- [Pix](https://pix.joseli.to)
- [Buy Me a Coffee](https://buymeacoffee.com/joselito)
- [GitHub Sponsors](https://github.com/sponsors/breakzplatform)

## License

GPL-3.0-only. See [LICENSE](LICENSE).
