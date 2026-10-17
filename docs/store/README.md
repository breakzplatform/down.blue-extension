# Store listing

Listing text for version 0.1.0 on the Chrome Web Store (CWS) and Firefox
Add-ons (AMO), in English and Brazilian Portuguese. Permission
justifications, reviewer notes and the release checklist are in
[SUBMISSION.md](SUBMISSION.md); the privacy policy is in [privacy.md](privacy.md).

The short descriptions below are the `extDescription` messages from
`_locales/*/messages.json` (both stores take the manifest description as the
summary). `test/store.test.mjs` checks that they stay identical and within
132 characters.

## Shared fields

| Field | Value |
|---|---|
| Name | down.blue |
| Version | 0.1.0 |
| Homepage | https://down.blue/ |
| Support | https://q.joseli.to/forms/notx-blue-bugs (pt-BR: https://q.joseli.to/forms/notx-blue-bugs-pt) |
| Privacy policy | https://down.blue/extension/privacy/ |
| License | GPL-3.0-only (see NOTICE) |
| CWS category | Tools |
| AMO categories | Download Management; Social & Communication |
| AMO tags | bluesky, video, gif, download |
| Languages | English (default), Português (Brasil) |
| Price | Free, no in-app purchases, no ads |

## Assets

| Asset | File | Notes |
|---|---|---|
| Icon 128x128 | `src/icons/icon-128.png` | CWS store icon: 96x96 artwork with 16px transparent padding |
| Icon 96x96 / 48x48 | `src/icons/icon-96.png`, `src/icons/icon-48.png` | AMO icon and extensions page; all three come from `src/icons/icon-app.svg`, the site's app icon |
| Toolbar 16/32 | `src/icons/icon-16.png`, `src/icons/icon-32.png` | From `src/icons/icon.svg`, the site's favicon |
| Screenshot 1 (EN) | `screenshots/en-1-buttons.png` | 1280x800, 24-bit PNG |
| Screenshot 2 (EN) | `screenshots/en-2-context-menu.png` | 1280x800, 24-bit PNG |
| Screenshot 3 (EN) | `screenshots/en-3-options.png` | 1280x800, 24-bit PNG |
| Screenshot 1 (pt-BR) | `screenshots/pt_BR-1-buttons.png` | 1280x800, 24-bit PNG |
| Screenshot 2 (pt-BR) | `screenshots/pt_BR-2-context-menu.png` | 1280x800, 24-bit PNG |
| Screenshot 3 (pt-BR) | `screenshots/pt_BR-3-options.png` | 1280x800, 24-bit PNG |
| Small promo tile (EN) | `screenshots/en-promo-440x280.png` | CWS, 440x280, 24-bit PNG |
| Small promo tile (pt-BR) | `screenshots/pt_BR-promo-440x280.png` | CWS, 440x280, 24-bit PNG |
| Marquee (EN) | `screenshots/en-marquee-1400x560.png` | CWS, optional, 1400x560, 24-bit PNG |
| Marquee (pt-BR) | `screenshots/pt_BR-marquee-1400x560.png` | CWS, optional, 1400x560, 24-bit PNG |

Screenshots are rendered by `npm run screenshots` (`scripts/screenshots.mjs`;
set `CHROMIUM_PATH` to use an installed Chrome instead of Playwright's)
from the static fixture in `fixture/`. The fixture only mimics the layout of a
feed; it loads no Bluesky page, logo or third-party content. Rerunning the
script on the same machine reproduces the files byte for byte; fonts come from
the host system, so another machine may differ slightly.

Promo images come from `fixture/promo.html` in the same run. Icons are
rendered by `scripts/build-icons.sh` (needs `resvg` and ImageMagick).

---

## English

### Short description (132 characters max)

```
Download Bluesky videos and GIFs with down.blue, from the toolbar, the right-click menu, and a button on every video post.
```

### Long description

```
down.blue adds a "Download with down.blue" button to Bluesky posts that contain a video or GIF. One click opens the post on down.blue, where you can save the media.

Three ways to use it:
• A download button in the post footer, next to Share, and on the video player itself.
• "Download with down.blue" in the right-click menu on a post, a post link, or a video.
• The toolbar button: click it on any post page to open that post on down.blue.

Works out of the box on bsky.app and on the social-app forks deer.social, blacksky.community, witchsky.app and northsky.app. If you use another fork, add its address on the options page; the browser asks you to allow that one site, and nothing else.

Options:
• Show the button on every post, not only on posts with media.
• Light, dark and terminal themes for the options page.

Privacy: the extension collects nothing. No analytics, no tracking, no accounts, no network requests of its own. It only opens a new tab at https://down.blue/?url=<post address> when you ask it to. Your settings stay in your browser's local storage.

down.blue is an independent project and is not affiliated with or endorsed by Bluesky Social PBC.
```

---

## Português (Brasil)

### Descrição curta (até 132 caracteres)

```
Baixe vídeos e GIFs do Bluesky com o down.blue pela barra de ferramentas, pelo menu de contexto ou por um botão nos posts com vídeo.
```

### Descrição completa

```
O down.blue adiciona um botão "Baixar com down.blue" aos posts do Bluesky que têm vídeo ou GIF. Um clique abre o post no down.blue, onde você pode salvar a mídia.

Três jeitos de usar:
• Um botão de download no rodapé do post, ao lado de Compartilhar, e no próprio player de vídeo.
• "Baixar com down.blue" no menu do botão direito sobre um post, um link de post ou um vídeo.
• O botão da barra de ferramentas: clique nele em qualquer página de post para abrir esse post no down.blue.

Funciona de cara no bsky.app e nos forks do social-app deer.social, blacksky.community, witchsky.app e northsky.app. Se você usa outro fork, adicione o endereço na página de opções; o navegador pede permissão só para esse site, e para nada além dele.

Opções:
• Mostrar o botão em todos os posts, não apenas nos que têm mídia.
• Temas claro, escuro e terminal para a página de opções.

Privacidade: a extensão não coleta nada. Sem analytics, sem rastreamento, sem contas, sem requisições de rede próprias. Ela só abre uma nova aba em https://down.blue/?url=<endereço do post> quando você pede. Suas configurações ficam no armazenamento local do navegador.

O down.blue é um projeto independente, sem vínculo com a Bluesky Social PBC e sem endosso dela.
```
