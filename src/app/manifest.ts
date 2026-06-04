import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Бюджет — особистий фінансовий трекер",
    short_name: "Бюджет",
    description:
      "Активи, витрати, доходи, бюджет, цілі та кредити — у твоєму особистому фінансовому трекері.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f8fa",
    theme_color: "#6366f1",
    lang: "uk",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/web-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/web-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/web-icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
