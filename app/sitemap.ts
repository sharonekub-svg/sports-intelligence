import type { MetadataRoute } from "next";

// Only the genuinely public, indexable routes. Everything under (app) and
// admin is noindex (see their layout metadata) and intentionally absent
// here — match pages etc. are not meant for public search indexing in v1.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const routes = ["", "/terms", "/privacy", "/disclaimer"];

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
  }));
}
