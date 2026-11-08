import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import release from "../src/data/release.json" with { type: "json" };
export { release };
export const digest = (bytes) =>
    createHash("sha256").update(bytes).digest("hex");
export async function validateRelease(value = release) {
    assert.equal(value.version, "0.1.0");
    assert.equal(value.tag, "v0.1.0");
    assert.equal(value.commit, "b60cb2e045fc9476034bffba7967b8674825fa18");
    assert.equal(value.tagObject, "70e4e2c54d7b05ef2aa6fc505eca599dc4373efc");
    assert.equal(value.releaseId, 425004090);
    assert.equal(
        value.url,
        "https://github.com/marawan6569/Nasj/releases/download/v0.1.0/",
    );
    assert.equal(value.assets.length, 9);
    assert.equal(new Set(value.assets.map((a) => a.name)).size, 9);
    // Independent, already-reviewed publication evidence, not the live API.
    const evidence = await readFile(
        "../docs/BINARY_VALIDATION_v0.1.0.md",
        "utf8",
    );
    const pins = [
        ...evidence.matchAll(/\| `([^`]+)` \| [\d,]+ \| `([a-f0-9]{64})` \|/g),
    ];
    assert.equal(pins.length, 9);
    for (const [, name, hash] of pins) {
        const asset = value.assets.find((a) => a.name === name);
        assert.equal(asset?.sha256, hash, `Unreviewed release pin: ${name}`);
        assert.equal(
            asset.manifest,
            name.startsWith("SHA256")
                ? null
                : name.includes("-source.")
                  ? "SHA256SUMS"
                  : "SHA256SUMS-binaries",
        );
    }
}
export function verifyDownloads(bytes, value = release) {
    for (const asset of value.assets) {
        assert.ok(bytes.has(asset.name), `Missing download: ${asset.name}`);
        assert.equal(
            digest(bytes.get(asset.name)),
            asset.sha256,
            `Changed public bytes: ${asset.name}`,
        );
        if (asset.bytes)
            assert.equal(bytes.get(asset.name).length, asset.bytes);
    }
    for (const name of ["SHA256SUMS", "SHA256SUMS-binaries"]) {
        const lines = bytes.get(name).toString("utf8").trim().split("\n");
        const expected = value.assets
            .filter((a) => a.manifest === name)
            .map((a) => `${a.sha256}  ${a.name}`)
            .sort();
        assert.deepEqual(
            lines.sort(),
            expected,
            `Wrong manifest association: ${name}`,
        );
    }
}
