import type { MetadataRoute } from "next";
import { basePath } from "./lib/base-path";

// Required under output: "export" — manifest.ts is a Route Handler under
// the hood, and static export needs every route explicitly marked static.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Bar Inventory",
        short_name: "Bar Inventory",
        description: "Self-hosted bar & stock tracker",
        start_url: `${basePath}/`,
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#003a6d",
        icons: [
            { src: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png" },
            { src: `${basePath}/icon-512.png`, sizes: "512x512", type: "image/png" },
        ],
    };
}
