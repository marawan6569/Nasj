import assert from "node:assert/strict";
import { test } from "node:test";
import {
    mkdtemp,
    cp,
    rm,
    readFile,
    writeFile,
    symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareInputs, pins } from "../scripts/demo-cache.mjs";
const source =
    process.env.NASJ_DEMO_CACHE || join(tmpdir(), "nasj-website-v010");
async function fixture(t, populated = true) {
    const cache = await mkdtemp(join(tmpdir(), "nasj-cache-test-"));
    t.after(() => rm(cache, { recursive: true, force: true }));
    if (populated)
        for (const name of [pins.archive, "SHA256SUMS-binaries", "nasj"])
            await cp(join(source, name), join(cache, name));
    return cache;
}
const offline = async () => {
    throw new Error("Network unavailable");
};
test("valid cache works with unavailable network and never calls fetch", async (t) => {
    await prepareInputs(await fixture(t), pins, {
        online: true,
        fetcher: offline,
    });
});
test("missing cache downloads only pinned inputs and then works offline", async (t) => {
    const cache = await fixture(t, false);
    const calls = [];
    await prepareInputs(cache, pins, {
        online: true,
        fetcher: async (url) => {
            const name = url.split("/").at(-1);
            calls.push(name);
            return new Response(await readFile(join(source, name)));
        },
    });
    assert.deepEqual(calls, [pins.archive, "SHA256SUMS-binaries"]);
    await prepareInputs(cache, pins, { fetcher: offline });
});
for (const name of [pins.archive, "SHA256SUMS-binaries", "nasj"])
    test(`corrupted ${name} fails before network or execution`, async (t) => {
        const cache = await fixture(t);
        await writeFile(join(cache, name), "poison");
        await assert.rejects(
            prepareInputs(cache, pins, { online: true, fetcher: offline }),
            /Cached input digest mismatch/,
        );
    });
test("missing inputs fail offline", async (t) => {
    await assert.rejects(
        prepareInputs(await fixture(t, false), pins),
        /Missing pinned inputs/,
    );
});
test("missing inputs fail with unavailable network", async (t) => {
    await assert.rejects(
        prepareInputs(await fixture(t, false), pins, {
            online: true,
            fetcher: offline,
        }),
        /Network unavailable/,
    );
});
test("untrusted downloaded bytes are rejected", async (t) => {
    await assert.rejects(
        prepareInputs(await fixture(t, false), pins, {
            online: true,
            fetcher: async () => new Response("poison"),
        }),
        /Downloaded release digest mismatch/,
    );
});
test("symlink cache input is rejected", async (t) => {
    const cache = await fixture(t);
    await rm(join(cache, "nasj"));
    await symlink(join(source, "nasj"), join(cache, "nasj"));
    await assert.rejects(prepareInputs(cache, pins), /regular file/);
});
test("manifest cannot replace independent executable pin", async (t) => {
    await assert.rejects(
        prepareInputs(await fixture(t), {
            ...pins,
            executable_sha256: "0".repeat(64),
        }),
        /Unapproved generator identity/,
    );
});
