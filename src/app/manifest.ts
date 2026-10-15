import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "The Plug | Sneakers & Apparel",
    short_name: "The Plug",
    description: "Install The Plug for one-tap access to sneaker and apparel sourcing in Botswana. If we can source it, you can get it.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0866FF",
    orientation: "portrait-primary",
    lang: "en",
    categories: ["shopping", "lifestyle"],
    prefer_related_applications: false,
    icons: [
      { src: "/plug-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/plug-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/plug-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/plug-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ],
    shortcuts: [
      {
        name: "Request a product",
        short_name: "Request",
        description: "Ask The Plug to source a sneaker or apparel item",
        url: "/request",
        icons: [{ src: "/plug-icon-192.png", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "My orders",
        short_name: "Orders",
        description: "View your requests and orders",
        url: "/account",
        icons: [{ src: "/plug-icon-192.png", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "The Plug admin",
        short_name: "Admin",
        description: "Open protected business control",
        url: "/admin",
        icons: [{ src: "/plug-icon-192.png", sizes: "192x192", type: "image/png" }]
      }
    ]
  };
}
