import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { admin, checked, url } from "../../scripts/db.mjs";
import { searchCatalog } from "../../scripts/catalog.mjs";

if (!/^http:\/\/(127\.0\.0\.1|localhost):54321$/.test(url))
  throw new Error("Local only");

test("an uncached search recovers from a temporary MusicBrainz refusal and caches only the successful response", async (t) => {
  const query = `recovery-${randomUUID()}`;
  const key = JSON.stringify(["paged-v1", "albums", "all", query, 0]);
  const originalFetch = globalThis.fetch;
  let upstreamCalls = 0;
  let reservations = 0;
  globalThis.fetch = async (input, options) => {
    const address = String(input);
    if (address.startsWith("https://musicbrainz.org/ws/2/")) {
      upstreamCalls++;
      return upstreamCalls === 1
        ? new Response("Temporarily unavailable", { status: 503 })
        : Response.json({ count: 0, "release-groups": [] });
    }
    if (address.includes("/rpc/reserve_catalog_slot")) reservations++;
    return originalFetch(input, options);
  };
  t.after(async () => {
    globalThis.fetch = originalFetch;
    checked(await admin.from("catalog_pages").delete().eq("key", key));
  });
  const result = await searchCatalog(query);
  assert.deepEqual(result.albums, []);
  assert.equal(upstreamCalls, 2);
  assert.equal(
    reservations,
    2,
    "every attempt must obey the shared MusicBrainz rate limit",
  );
  assert.equal(
    checked(await admin.from("catalog_pages").select("key").eq("key", key))
      .length,
    1,
  );
  await searchCatalog(query);
  assert.equal(
    upstreamCalls,
    2,
    "the successful response is served from cache",
  );
});
