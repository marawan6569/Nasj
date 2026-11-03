import type { APIRoute } from "astro";
import { home } from "../lib/paths";
export const GET: APIRoute = ({ site }) =>
    new Response(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["en", "ar"].map((locale) => `<url><loc>${new URL(home(locale as "en" | "ar"), site).href}</loc></url>`).join("")}</urlset>`,
        { headers: { "Content-Type": "application/xml" } },
    );
