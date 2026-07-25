import type { NextConfig } from "next";
import { basePath } from "./app/lib/base-path";

const nextConfig: NextConfig = {
  output: "export",
  // Deliberately NOT trailingSlash: true — with output: "export" that
  // makes Next emit each route as a directory ("login/index.html")
  // instead of a flat file ("login.html"), which broke client-side
  // hydration entirely on this app (confirmed by testing: the flat file
  // hydrates fine, the directory form gets stuck on the initial loading
  // state with zero errors logged). GitHub Pages serves "/login" as
  // "login.html" natively, so the flat form works there too.
  basePath,
  assetPrefix: basePath,
};

export default nextConfig;
