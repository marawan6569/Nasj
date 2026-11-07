// Read-only identity capture for an already verified production build.
// Redirect stdout to reviews/<name>.json; never writes or updates screenshots.
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const excluded = new Set([
    "node_modules",
    ".astro",
    "dist",
    "reviews",
    "artifact.tar",
    "test-results",
    "playwright-report",
]);
async function inventory(directory, prefix, skip = new Set()) {
    const entries = {};
    for (const item of (await readdir(directory, { withFileTypes: true })).sort(
        (a, b) => a.name.localeCompare(b.name),
    )) {
        if (skip.has(item.name)) continue;
        const path = `${directory}/${item.name}`;
        const name = `${prefix}${item.name}`;
        if (item.isDirectory())
            Object.assign(entries, await inventory(path, `${name}/`, skip));
        else if (item.isFile()) entries[name] = sha256(await readFile(path));
        else throw new Error(`Non-regular identity input: ${name}`);
    }
    return entries;
}
function identity(files) {
    const sorted = Object.fromEntries(
        Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
    return {
        sha256: sha256(
            Object.entries(sorted)
                .map(([path, hash]) => `${hash}  ${path}\n`)
                .join(""),
        ),
        files: sorted,
    };
}
const sources = await inventory(".", "website/", excluded);
for (const path of [
    ".editorconfig",
    "LICENSE",
    ".github/workflows/website.yml",
    ".github/workflows/website-audit.yml",
    ".github/workflows/website-deploy.yml",
    "docs/BINARY_VALIDATION_v0.1.0.md",
    "fixtures/nginx/multi-vhost.conf",
    "docs/website/WEBSITE_PLAN.md",
])
    sources[path] = sha256(await readFile(`../${path}`));
const baselines = await inventory(
    "tests/screenshots",
    "website/tests/screenshots/",
);
const approved = JSON.parse(
    await readFile("reviews/baseline-provenance.json", "utf8"),
);
if (
    JSON.stringify(identity(baselines).files) !==
    JSON.stringify(identity(approved.baselines).files)
)
    throw new Error("Existing screenshot baseline bytes changed");
const browser = await chromium.launch();
let browserVersion;
try {
    browserVersion = browser.version();
} finally {
    await browser.close();
}
console.log(
    JSON.stringify(
        {
            schema: 1,
            recordedAt: new Date().toISOString(),
            gitHead: execFileSync("git", ["rev-parse", "HEAD"], {
                encoding: "utf8",
            }).trim(),
            branch: execFileSync("git", ["branch", "--show-current"], {
                encoding: "utf8",
            }).trim(),
            description:
                "Checked-out website inputs; reviews and generated/cache directories excluded. Hosted status is recorded separately.",
            worktreeClean:
                execFileSync("git", ["status", "--porcelain"], {
                    encoding: "utf8",
                }).trim() === "",
            digestAlgorithm: approved.digestAlgorithm,
            environment: {
                node: process.version,
                npm: execFileSync("npm", ["--version"], {
                    encoding: "utf8",
                }).trim(),
                platform: process.platform,
                architecture: process.arch,
                osRelease: await readFile("/etc/os-release", "utf8"),
                playwright: JSON.parse(
                    await readFile(
                        "node_modules/@playwright/test/package.json",
                        "utf8",
                    ),
                ).version,
                chromium: browserVersion,
                chromiumRevision: JSON.parse(
                    await readFile(
                        "node_modules/playwright-core/browsers.json",
                        "utf8",
                    ),
                ).browsers.find((b) => b.name === "chromium").revision,
            },
            base: process.env.WEBSITE_BASE || "/Nasj/",
            source: identity(sources),
            productionOutput: identity(await inventory("dist", "")),
            baselines: identity(baselines),
        },
        null,
        4,
    ),
);
