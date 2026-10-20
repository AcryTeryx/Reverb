import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchMusicBrainz, retryDelay } from "../scripts/musicbrainz.mjs";

test("MusicBrainz respects Retry-After without blocking the client past its timeout", async (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("Busy", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  await assert.rejects(
    fetchMusicBrainz(
      new URL("https://musicbrainz.org/ws/2/recording"),
      async () => 0,
    ),
    /limite temporairement/,
  );
  assert.equal(calls, 1);
});

test("invalid requests are not repeatedly sent to MusicBrainz", async (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("Bad query", { status: 400 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  await assert.rejects(
    fetchMusicBrainz(
      new URL("https://musicbrainz.org/ws/2/recording"),
      async () => 0,
    ),
    /n’a pas accepté/,
  );
  assert.equal(calls, 1);
});

test("Retry-After supports seconds and HTTP dates", () => {
  assert.equal(retryDelay("2"), 2000);
  assert.equal(
    retryDelay(
      "Wed, 14 Oct 2026 10:00:02 GMT",
      Date.parse("2026-10-14T10:00:00Z"),
    ),
    2000,
  );
  assert.equal(retryDelay("invalid"), 0);
});
