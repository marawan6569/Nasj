import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
// Build/test dependencies are not redistributed in the static site. MPL tools
// and libvips/Sharp's LGPL platform binaries are tracked explicitly here.
const allowed = new Set([
    "MIT",
    "ISC",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "0BSD",
    "BlueOak-1.0.0",
    "CC0-1.0",
    "MPL-2.0",
    "LGPL-3.0-or-later",
    "Apache-2.0 AND LGPL-3.0-or-later AND MIT",
    "Apache-2.0 AND LGPL-3.0-or-later",
]);
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const counts = {};
for (const [name, entry] of Object.entries(lock.packages)) {
    if (!name) continue;
    assert.ok(
        allowed.has(entry.license),
        `${name}: license requires review (${entry.license})`,
    );
    assert.ok(
        entry.resolved?.startsWith("https://registry.npmjs.org/"),
        `${name}: unexpected package source`,
    );
    assert.ok(
        /^sha512-/.test(entry.integrity),
        `${name}: missing lockfile integrity`,
    );
    counts[entry.license] = (counts[entry.license] || 0) + 1;
}
console.log("Locked package sources, integrity and license inventory:", counts);
