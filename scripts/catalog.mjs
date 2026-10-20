import { admin, checked } from "./db.mjs";
import { fetchMusicBrainz } from "./musicbrainz.mjs";
import {
  PAGE_SIZE,
  catalogOptions,
  buildCatalogQuery,
} from "./catalog-query.mjs";
export { normalizeQuery } from "./catalog-query.mjs";
const pending = new Map();

export async function searchCatalog(raw, options = {}) {
  const input = catalogOptions(raw, options);
  const key = JSON.stringify([
    "paged-v1",
    input.type,
    input.scope,
    input.query,
    input.offset,
  ]);
  if (pending.has(key)) return pending.get(key);
  const work = search(input, key).finally(() => pending.delete(key));
  pending.set(key, work);
  return work;
}

async function search(input, key) {
  checked(
    await admin
      .from("catalog_pages")
      .delete()
      .lt("expires_at", new Date().toISOString()),
  );
  const cached = checked(
    await admin
      .from("catalog_pages")
      .select("payload")
      .eq("key", key)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle(),
  );
  if (cached) return cached.payload;
  const request = new URL(
    `https://musicbrainz.org/ws/2/${input.type === "albums" ? "release-group" : "recording"}`,
  );
  request.search = new URLSearchParams({
    query: buildCatalogQuery(input),
    fmt: "json",
    limit: String(PAGE_SIZE),
    offset: String(input.offset),
  }).toString();
  const response = await fetchMusicBrainz(request, async () =>
    checked(await admin.rpc("reserve_catalog_slot")),
  );
  const data = await response.json();
  const raw =
    data[input.type === "albums" ? "release-groups" : "recordings"] ?? [];
  const credit = (item) =>
    (item["artist-credit"] ?? [])
      .map(
        (part) =>
          (part.name ?? part.artist?.name ?? "") + (part.joinphrase ?? ""),
      )
      .join("");
  const entries =
    input.type === "albums"
      ? raw
          .filter(
            (group) =>
              ["Album", "EP"].includes(group["primary-type"]) &&
              !(group["secondary-types"] ?? []).some((type) =>
                ["Live", "Compilation", "Remix", "DJ-mix"].includes(type),
              ),
          )
          .map((group) => ({
            mbid: group.id,
            title: group.title,
            artist: credit(group),
            kind: group["primary-type"],
            release_date: group["first-release-date"] ?? "",
            source_url: `https://musicbrainz.org/release-group/${group.id}`,
            fetched_at: new Date().toISOString(),
          }))
      : raw.map((song) => ({
          mbid: song.id,
          title: song.title,
          artist: credit(song),
          disambiguation: song.disambiguation ?? "",
          duration_ms: song.length ?? null,
          first_release_date: song["first-release-date"] ?? "",
          source_url: `https://musicbrainz.org/recording/${song.id}`,
          fetched_at: new Date().toISOString(),
        }));
  const unique = [
    ...new Map(entries.map((entry) => [entry.mbid, entry])).values(),
  ];
  const rows = unique.length
    ? checked(
        await admin
          .from(input.type === "albums" ? "albums" : "recordings")
          .upsert(unique, { onConflict: "mbid" })
          .select(),
      )
    : [];
  const ordered = unique
    .map((entry) => rows.find((row) => row.mbid === entry.mbid))
    .filter(Boolean);
  const total = Number(data.count ?? raw.length);
  const next = input.offset + raw.length;
  const payload = {
    albums: input.type === "albums" ? ordered : [],
    recordings: input.type === "recordings" ? ordered : [],
    total,
    nextOffset: raw.length && next < total ? next : null,
  };
  checked(
    await admin.from("catalog_pages").upsert({
      key,
      payload,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    }),
  );
  return payload;
}
