// Fills the screenshot fixture for the requested scene and language.
// The extension API stub is installed by scripts/screenshots.mjs before this runs.
(function () {
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang") === "pt_BR" ? "pt_BR" : "en";
  const scene = params.get("scene") || "buttons";

  const strings = {
    en: {
      buttons: "Download Bluesky videos and GIFs <em>in one click</em>",
      menu: "Or <em>right-click</em> any post, link or video",
      post1: "Sunset timelapse from the ridge last night. Sound on!",
      post2: "No video here, so no button by default. You can show it on every post from the options page.",
      home: "Home",
      explore: "Explore",
      notifications: "Notifications",
      chat: "Chat",
      feeds: "Feeds",
      profile: "Profile",
      settings: "Settings",
      following: "Following",
      play: "Play",
      loop: "Loop",
      controls: "Show controls",
      inspect: "Inspect"
    },
    pt_BR: {
      buttons: "Baixe vídeos e GIFs do Bluesky <em>com um clique</em>",
      menu: "Ou use o <em>botão direito</em> no post, link ou vídeo",
      post1: "Timelapse do pôr do sol ontem à noite, lá do morro. Liga o som!",
      post2: "Sem vídeo aqui, então sem botão por padrão. Dá para mostrar em todos os posts na página de opções.",
      home: "Início",
      explore: "Explorar",
      notifications: "Notificações",
      chat: "Chat",
      feeds: "Feeds",
      profile: "Perfil",
      settings: "Configurações",
      following: "Seguindo",
      play: "Reproduzir",
      loop: "Repetir",
      controls: "Mostrar controles",
      inspect: "Inspecionar"
    }
  }[lang];

  document.documentElement.lang = lang === "pt_BR" ? "pt-BR" : "en";
  document.getElementById("caption").innerHTML = strings[scene];
  for (const el of document.querySelectorAll("[data-text]")) {
    el.textContent = strings[el.getAttribute("data-text")];
  }

  for (const el of document.querySelectorAll("[data-ctx]")) {
    const key = el.getAttribute("data-ctx");
    el.textContent = key === "download" ? globalThis.chrome.i18n.getMessage("menuTitle") : strings[key];
  }

  if (scene === "menu") {
    const video = document.getElementById("video").getBoundingClientRect();
    const ctx = document.getElementById("ctx");
    ctx.style.left = `${Math.round(video.left + video.width * 0.55)}px`;
    ctx.style.top = `${Math.round(video.top + video.height * 0.3)}px`;
    ctx.hidden = false;
  }
})();
