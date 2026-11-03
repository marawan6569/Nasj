// Serve the actual static output under the configured Pages prefix; no SPA fallback.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist");
const base = (process.env.WEBSITE_BASE || "/Nasj/").replace(/\/?$/, "/");
const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css",
    ".js": "text/javascript",
    ".png": "image/png",
    ".woff2": "font/woff2",
    ".xml": "application/xml",
    ".txt": "text/plain; charset=utf-8",
};
const server = createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(
            new URL(req.url, "http://localhost").pathname,
        );
        if (pathname === base.slice(0, -1)) {
            res.writeHead(301, { Location: base });
            return res.end();
        }
        if (!pathname.startsWith(base)) throw new Error("outside base");
        let file = resolve(root, pathname.slice(base.length));
        if (file !== root && !file.startsWith(root + sep))
            throw new Error("outside root");
        if ((await stat(file)).isDirectory()) {
            if (!pathname.endsWith("/")) {
                res.writeHead(301, { Location: pathname + "/" });
                return res.end();
            }
            file = resolve(file, "index.html");
        }
        res.writeHead(200, {
            "Content-Type": types[extname(file)] || "application/octet-stream",
        });
        res.end(await readFile(file));
    } catch {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(await readFile(resolve(root, "404.html")));
    }
});
server.listen(4321, "127.0.0.1", () =>
    console.log(`Production preview: http://127.0.0.1:4321${base}`),
);
