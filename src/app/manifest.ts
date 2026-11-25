import type { MetadataRoute } from "next";

// Web App Manifest: makes the site installable to the phone's home screen (full-screen, no browser bar).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home PC Phone",
    short_name: "PC Phone",
    description: "A phone-style OS that runs apps and stores files on your PC.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1020",
    theme_color: "#0b1020",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
