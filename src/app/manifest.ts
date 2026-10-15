import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Mogobe Butchery",
    short_name: "Mogobe",
    description: "Shop Mogobe Butchery favourites and request collection or delivery in Gaborone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#922a2b",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["shopping", "food"],
    prefer_related_applications: false,
    icons: [{ src: "/mogobe-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "Shop meat", short_name: "Shop", description: "Browse the Mogobe counter", url: "/#shop", icons: [{ src: "/mogobe-icon.svg", sizes: "any", type: "image/svg+xml" }] },
      { name: "Your basket", short_name: "Basket", description: "Review your selection", url: "/basket", icons: [{ src: "/mogobe-icon.svg", sizes: "any", type: "image/svg+xml" }] }
    ]
  };
}
