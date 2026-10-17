globalThis.DownBlue = {
  // bsky.app (official client)
  // deer.social (fork)
  // blacksky.community (fork)
  // witchsky.app (fork)
  // northsky.app (fork)
  BUILTIN_DOMAINS: [
    "bsky.app",
    "deer.social",
    "blacksky.community",
    "witchsky.app",
    "northsky.app"
  ],

  normalizeDomain(domain) {
    if (typeof domain !== "string") throw new Error("Invalid domain");
    let lower = domain.trim().toLowerCase();
    lower = lower.replace(/^https?:\/\//, ""); // strip scheme
    lower = lower.split(/[/?#]/)[0]; // strip path, query and fragment
    if (lower.includes("@") || lower.startsWith("[")) {
      // userinfo and IPv6 literals are never valid sites
      throw new Error("Invalid domain");
    }
    lower = lower.split(":")[0]; // strip port
    lower = lower.replace(/\.+$/, ""); // strip trailing dots (FQDN form)
    // do NOT strip www
    if (!lower) throw new Error("Invalid domain");

    // Convert internationalized names to their punycode (ASCII) form, which
    // is what match patterns and host permissions are compared against.
    try {
      lower = new URL(`https://${lower}/`).hostname;
    } catch {
      throw new Error("Invalid domain");
    }

    const labels = lower.split(".");
    const labelRe = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (lower.length > 253 || labels.length < 2 || !labels.every(l => labelRe.test(l))
      || /^\d+$/.test(labels[labels.length - 1])) {
      // rejects localhost, single-label names, IPv4 addresses and bad characters
      throw new Error("Invalid domain");
    }
    if (this.BUILTIN_DOMAINS.includes(lower)) {
      throw new Error("Domain is already built-in");
    }
    return lower;
  },

  parsePostUrl(postUrl) {
    const input = String(postUrl || "").trim();
    let rawProfile;
    let rawPost;

    const atUri = input.match(/^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)\/?$/);
    if (atUri) {
      rawProfile = atUri[1];
      rawPost = atUri[2];
    } else {
      let url;
      try {
        url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`);
      } catch {
        throw new Error("Invalid URL");
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Invalid URL");
      }

      let path = url.pathname;
      const tailMatch = path.match(/^(.*?)\/(liked-by|reposted-by|quotes)\/?$/);
      if (tailMatch) {
        path = tailMatch[1];
      }

      const m = path.match(/^\/profile\/([^/]+)\/post\/([^/]+)\/?$/);
      if (!m) throw new Error("Invalid URL format");
      rawProfile = m[1];
      rawPost = m[2];
    }

    let profile;
    let post;
    try {
      profile = decodeURIComponent(rawProfile);
      post = decodeURIComponent(rawPost);
    } catch {
      throw new Error("Invalid URL format");
    }

    if (!/^[a-zA-Z0-9._:-]{1,253}$/.test(profile) || !/^[a-zA-Z0-9._:~-]{1,512}$/.test(post)
      || [".", ".."].includes(profile) || [".", ".."].includes(post)) {
      throw new Error("Invalid URL format");
    }

    return { profile, post, url: `https://bsky.app/profile/${profile}/post/${post}` };
  },

  buildHandoffUrl(canonical) {
    return `https://down.blue/?url=${encodeURIComponent(canonical)}`;
  }
};
