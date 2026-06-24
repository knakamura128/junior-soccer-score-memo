import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FC KUMANO 管理",
    short_name: "FC KUMANO",
    description: "FC KUMANO schedule and score management",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4efe5",
    theme_color: "#1b6b45",
    icons: [
      {
        src: "/fc-kumano-logo.png",
        type: "image/png"
      }
    ]
  };
}
