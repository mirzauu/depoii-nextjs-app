import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/icon.svg"],
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/claims",
          "/pipeline",
          "/settings",
          "/parcels",
          "/permits",
          "/property",
        ],
      },
    ],
    sitemap: "https://app.depoii.com/sitemap.xml",
  };
}
