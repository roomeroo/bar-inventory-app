import type { NextConfig } from "next";

// GitHub Pages serves this repo at /bar-inventory-app/, not the domain
// root, so every asset/route needs that prefix. Only applied when the
// GitHub Actions workflow sets GITHUB_PAGES — local dev and other hosts
// (Vercel, etc.) still serve from "/".
const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoBasePath = "/bar-inventory-app";

const nextConfig: NextConfig = {
  output: "export",
  // Deliberately NOT trailingSlash: true — with output: "export" that
  // makes Next emit each route as a directory ("login/index.html")
  // instead of a flat file ("login.html"), which broke client-side
  // hydration entirely on this app (confirmed by testing: the flat file
  // hydrates fine, the directory form gets stuck on the initial loading
  // state with zero errors logged). GitHub Pages serves "/login" as
  // "login.html" natively, so the flat form works there too.
  basePath: isGithubPages ? repoBasePath : "",
  assetPrefix: isGithubPages ? repoBasePath : "",
};

export default nextConfig;
