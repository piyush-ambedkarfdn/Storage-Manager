import type { MetadataRoute } from "next";
import { APP } from "@/config/app";

/** Web app manifest (served at /manifest.webmanifest): lets staff "Add to home screen" and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP.name,
    short_name: APP.name.length > 12 ? "Photos" : APP.name,
    description: "Upload field photos and reports, even on a weak network.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f6fa",
    theme_color: "#1f4e9c",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Upload photos", url: "/upload", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My uploads", url: "/my-uploads", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
