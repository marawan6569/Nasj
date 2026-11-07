// Explicit online audit: never changes release pins or published assets.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {
    release,
    validateRelease,
    verifyDownloads,
} from "./release-contract.mjs";
await validateRelease();
const api = "https://api.github.com/repos/marawan6569/Nasj/";
async function json(path) {
    const response = await fetch(api + path, {
        headers: {
            Accept: "application/vnd.github+json",
            ...(process.env.GITHUB_TOKEN
                ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
                : {}),
        },
        signal: AbortSignal.timeout(60000),
    });
    assert.ok(response.ok, `Release API unavailable: ${response.status}`);
    return response.json();
}
const [published, tag, latest] = await Promise.all([
    json("releases/tags/v0.1.0"),
    json("git/ref/tags/v0.1.0"),
    json("releases/latest"),
]);
assert.equal(published.id, release.releaseId);
assert.equal(published.draft, false);
assert.equal(published.prerelease, false);
assert.equal(tag.object.sha, release.tagObject);
assert.equal(
    (await json(`git/tags/${tag.object.sha}`)).object.sha,
    release.commit,
);
assert.deepEqual(
    published.assets.map((a) => a.name).sort(),
    release.assets.map((a) => a.name).sort(),
);
const bytes = new Map(
    await Promise.all(
        release.assets.map(async (asset) => {
            const url = release.url + asset.name;
            assert.equal(
                published.assets.find((a) => a.name === asset.name)
                    .browser_download_url,
                url,
            );
            // Public downloads deliberately use no API credential and no cache.
            const response = await fetch(url, {
                cache: "no-store",
                signal: AbortSignal.timeout(60000),
            });
            assert.ok(
                response.ok,
                `Download unavailable: ${asset.name} (${response.status})`,
            );
            return [asset.name, Buffer.from(await response.arrayBuffer())];
        }),
    ),
);
verifyDownloads(bytes);
const evidence = {
    checkedAt: new Date().toISOString(),
    release: release.tag,
    commit: release.commit,
    latest: latest.tag_name,
    drift: latest.tag_name !== release.tag,
    assets: release.assets.map((a) => ({
        name: a.name,
        bytes: bytes.get(a.name).length,
        sha256: a.sha256,
    })),
};
await mkdir("test-results/release", { recursive: true });
await writeFile(
    "test-results/release/verification.json",
    JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
if (evidence.drift)
    throw new Error(
        "New release exists: review required; pins were not changed",
    );
