import type { APIRoute } from "astro";
import { pagePath, contentRoutes, type Locale } from "../lib/paths";
export const GET: APIRoute = ({ site }) =>
    new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["", "demo", ...contentRoutes].flatMap((slug) => ["en", "ar"].map((locale) => `<url><loc>${new URL(pagePath(locale as Locale, slug), site).href}</loc></url>`)).join("")}</urlset>`,
        { headers: { "Content-Type": "application/xml" } },
    );
