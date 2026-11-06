import assert from "node:assert/strict";
import {
    lstat,
    readFile,
    mkdir,
    mkdtemp,
    writeFile,
    rename,
    rm,
} from "node:fs/promises";
import { join } from "node:path";
import { sha256 } from "./demo-contract.mjs";

// Independent release pins: cache keys and manifest declarations are not trust anchors.
export const pins = Object.freeze({
    archive: "nasj-v0.1.0-linux-x86_64.tar.gz",
    archive_sha256:
        "3ec95fbd277382902f2adb91e37205e33c8e20f10053b1cc0cd14cec97ad6c02",
    checksums_sha256:
        "12591beec119bd3c2c27ad48a61c572a8d99d06030f850186a396d8be61cd0e7",
    executable_sha256:
        "0cccbf0442c1cd6fc7124f649722fd7deb141798414416d3d749e13d4b7b4c38",
    release_url:
        "https://github.com/marawan6569/Nasj/releases/download/v0.1.0/",
});
export const cacheKey =
    "nasj-v010-linux-x64-" +
    [pins.archive_sha256, pins.checksums_sha256, pins.executable_sha256].join(
        "-",
    );
export async function prepareInputs(
    cache,
    generator,
    { online = false, force = false, fetcher = fetch } = {},
) {
    for (const [key, value] of Object.entries(pins))
        assert.equal(generator[key], value, "Unapproved generator identity");
    await mkdir(cache, { recursive: true });
    assert.ok(
        (await lstat(cache)).isDirectory(),
        "Cache must be a real directory",
    );
    const missing = [];
    // Validate every restored file before any download or execution. Corruption fails closed.
    for (const [name, digest] of [
        [pins.archive, pins.archive_sha256],
        ["SHA256SUMS-binaries", pins.checksums_sha256],
        ["nasj", pins.executable_sha256],
    ]) {
        const path = join(cache, name);
        try {
            assert.ok(
                (await lstat(path)).isFile(),
                "Cache input must be a regular file",
            );
            assert.equal(
                sha256(await readFile(path)),
                digest,
                "Cached input digest mismatch",
            );
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
            if (name !== "nasj") missing.push([name, digest]);
        }
    }
    assert.ok(
        online || missing.length === 0,
        "Missing pinned inputs; run demos:ensure to provision",
    );
    const downloads = force
        ? [
              [pins.archive, pins.archive_sha256],
              ["SHA256SUMS-binaries", pins.checksums_sha256],
          ]
        : missing;
    for (const [name, digest] of downloads) {
        const response = await fetcher(pins.release_url + name);
        assert.ok(response.ok, "Pinned release download failed");
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(
            sha256(bytes),
            digest,
            "Downloaded release digest mismatch",
        );
        const temporary = await mkdtemp(join(cache, "download-"));
        try {
            await writeFile(join(temporary, "input"), bytes);
            await rename(join(temporary, "input"), join(cache, name));
        } finally {
            await rm(temporary, { recursive: true, force: true });
        }
    }
}
