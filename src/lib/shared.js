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
    lower = lower.split("/")[0]; // strip path
    lower = lower.split(":")[0]; // strip port
    // do NOT strip www
    if (!lower || lower === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(lower) || lower.includes(" ")) {
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
