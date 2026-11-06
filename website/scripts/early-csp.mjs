import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
// Astro emits CSP with injected head assets, after author-written head content.
// Move that exact generated tag before the early theme script. Do not serialize
// the DOM, edit the policy, or change any hashed script/style bytes.
export default function earlyCsp() {
    return {
        name: "nasj-early-csp",
        hooks: {
            "astro:build:done": async ({ dir }) => {
                const visit = async (directory) => {
                    for (const entry of await readdir(directory, {
                        withFileTypes: true,
                    })) {
                        const path = `${directory}/${entry.name}`;
                        // Published reports are copied byte-for-byte. Their own
                        // released CSP and document serialization are immutable.
                        if (entry.isDirectory() && entry.name !== "demos")
                            await visit(path);
                        else if (entry.name.endsWith(".html")) {
                            const html = await readFile(path, "utf8");
                            const tags = html.match(
                                /<meta\s+http-equiv="content-security-policy"[^>]*>/gi,
                            );
                            if (tags?.length !== 1)
                                throw new Error(
                                    `Expected exactly one generated CSP in ${path}`,
                                );
                            const without = html.replace(tags[0], "");
                            const result = without.replace(
                                /(<meta charset="utf-8"\s*\/?>)/i,
                                `$1${tags[0]}`,
                            );
                            if (!result.includes(tags[0]))
                                throw new Error(`Missing charset in ${path}`);
                            await writeFile(path, result);
                        }
                    }
                };
                await visit(fileURLToPath(dir));
            },
        },
    };
}
