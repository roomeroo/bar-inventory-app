// Shared with next.config.ts and anywhere metadata needs to link to a
// static asset by absolute path (e.g. manifest icons) — GitHub Pages
// serves this repo at /bar-inventory-app/, not the domain root.
export const isGithubPages = process.env.GITHUB_PAGES === "true";
export const basePath = isGithubPages ? "/bar-inventory-app" : "";
