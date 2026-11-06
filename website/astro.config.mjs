import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import earlyCsp from "./scripts/early-csp.mjs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { transform } from "esbuild";

// set:html is dynamic at build time: explicitly authorize the exact theme bytes.
const theme = (
    await transform(
        await readFile(
            new URL("./src/scripts/theme.ts", import.meta.url),
            "utf8",
        ),
        {
            loader: "ts",
            minify: true,
            target: "es2022",
        },
    )
).code;
const themeHash =
    "sha256-" + createHash("sha256").update(theme).digest("base64");

export default defineConfig({
    site: "https://marawan6569.github.io",
    base: process.env.WEBSITE_BASE || "/Nasj/",
    trailingSlash: "always",
    output: "static",
    integrations: [earlyCsp()],
    markdown: { syntaxHighlight: false },
    build: { inlineStylesheets: "never" },
    vite: { plugins: [tailwindcss()] },
    security: {
        csp: {
            algorithm: "SHA-256",
            directives: [
                "default-src 'none'",
                "img-src 'self'",
                "font-src 'self'",
                "connect-src 'none'",
                "object-src 'none'",
                "base-uri 'none'",
                "form-action 'none'",
                "worker-src 'none'",
            ],
            scriptDirective: {
                hashes: [{ hash: themeHash, kind: "element" }],
                resources: [
                    { resource: "'self'", kind: "element" },
                    { resource: "'none'", kind: "attribute" },
                ],
                strictDynamic: false,
            },
            styleDirective: {
                resources: [
                    { resource: "'self'", kind: "element" },
                    { resource: "'none'", kind: "attribute" },
                ],
            },
        },
    },
});
