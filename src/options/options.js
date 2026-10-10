const api = globalThis.browser ?? globalThis.chrome;
const builtinList = document.getElementById('builtin-list');
const customList = document.getElementById('custom-list');
const form = document.getElementById('add-site-form');
const input = document.getElementById('site-input');
const errorDiv = document.getElementById('site-error');
const footerCheck = document.getElementById('footer-all-posts');
const themeBtn = document.getElementById('theme-btn');

document.querySelectorAll('[data-i18n]').forEach(el => {
  el.textContent = api.i18n.getMessage(el.getAttribute('data-i18n'));
});

const themes = ["light", "dark", "terminal"];
let currentTheme = "light";

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const next = themes[(themes.indexOf(theme) + 1) % themes.length];
  themeBtn.textContent = api.i18n.getMessage("optThemeBtn") + " " + next;
}

api.storage.local.get("theme").then(res => {
  applyTheme(res.theme || "light");
});

themeBtn.addEventListener('click', () => {
  const next = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
  api.storage.local.set({ theme: next });
  applyTheme(next);
});

globalThis.DownBlue.BUILTIN_DOMAINS.forEach(d => {
  const li = document.createElement('li');
  li.textContent = d;
  builtinList.appendChild(li);
});

function renderCustom(domains) {
  customList.innerHTML = '';
  domains.forEach(d => {
    const li = document.createElement('li');
    li.textContent = d;
    const btn = document.createElement('button');
    btn.textContent = api.i18n.getMessage("optRemove");
    btn.onclick = () => {
      const origins = [`https://${d}/*`];
      api.permissions.remove({ origins }).then(() => {
        const next = domains.filter(x => x !== d);
        api.storage.local.set({ customDomains: next }).then(() => {
          renderCustom(next);
        });
      });
    };
    li.appendChild(btn);
    customList.appendChild(li);
  });
}

let currentCustom = [];
api.storage.local.get("customDomains").then(res => {
  currentCustom = res.customDomains || [];
  renderCustom(currentCustom);
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  errorDiv.textContent = "";
  let domain;
  try {
    domain = globalThis.DownBlue.normalizeDomain(input.value);
  } catch (err) {
    errorDiv.textContent = api.i18n.getMessage("optInvalidDomain") || err.message;
    return;
  }
  
  if (currentCustom.includes(domain)) {
    errorDiv.textContent = api.i18n.getMessage("optDomainExists");
    return;
  }
  
  const origins = [`https://${domain}/*`];
  if (api.permissions.request) {
    api.permissions.request({ origins }).then(granted => {
      if (granted) {
        currentCustom.push(domain);
        api.storage.local.set({ customDomains: currentCustom }).then(() => {
          renderCustom(currentCustom);
          input.value = "";
        });
      } else {
        errorDiv.textContent = api.i18n.getMessage("optPermissionDenied");
      }
    });
  } else {
    // some very old environments might not have it
    currentCustom.push(domain);
    api.storage.local.set({ customDomains: currentCustom }).then(() => {
      renderCustom(currentCustom);
      input.value = "";
    });
  }
});

api.storage.local.get("footerAllPosts").then(res => {
  footerCheck.checked = !!res.footerAllPosts;
});
footerCheck.addEventListener('change', () => {
  api.storage.local.set({ footerAllPosts: footerCheck.checked });
});
