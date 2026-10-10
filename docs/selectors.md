# Selectors

All DOM selectors are defined in one frozen `SELECTORS` object in `src/content/content.js`. They are unified across all five supported social-app forks (bsky.app, deer.social, blacksky.community, witchsky.app, northsky.app) since they share the same DOM structure and `data-testid` values.

Date verified: 2026-10-10.

| Element | Selector | Description |
|---|---|---|
| **Post Containers** | `[data-testid^="postThreadItem-by-"], [data-testid^="feedItem-by-"]` | Matches individual posts in feeds and threads. Suffix is the author handle. |
| **Share Button Wrapper** | `[data-testid="postShareBtn"], [data-testid="shareBtn"]` | The footer share button (deer.social uses `shareBtn`; the others `postShareBtn`). We insert our download button wrapper after this wrapper. |
| **Player Wrapper** | `[aria-label="Embedded video player"]` | The container for the video embed, which gets our absolute-positioned player button. Fallbacks: `video.closest("figure")?.parentElement` or `video.parentElement`. |
| **Media Links** | `a[href*="tenor.com"], a[href*="giphy.com"], img[src*="tenor.com"], img[src*="giphy.com"], video` | Detects if a post container has media (GIF or video). |

To re-verify:
Load any of the supported sites, inspect a post with a video/GIF, and ensure these selectors still match the respective DOM nodes.
