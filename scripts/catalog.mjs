import { setTimeout as sleep } from "node:timers/promises";
import { admin, checked } from "./db.mjs";
const pending = new Map();
export function normalizeQuery(query) {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}
export async function searchCatalog(raw) {
  const query = normalizeQuery(raw);
  if (query.length < 2 || query.length > 100)
    throw new Error("Saisissez entre 2 et 100 caractères.");
  if (pending.has(query)) return pending.get(query);
  const work = search(query).finally(() => pending.delete(query));
  pending.set(query, work);
  return work;
}
async function search(query) {
  const cacheKey = `official-v2:${query}`;
  checked(
    await admin
      .from("catalog_cache")
      .delete()
      .lt("expires_at", new Date().toISOString()),
  );
  const cached = checked(
    await admin
      .from("catalog_cache")
      .select("*")
      .eq("query", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle(),
  );
  if (cached) {
    if (!cached.album_ids.length) return [];
    const albums = checked(
      await admin.from("albums").select("*").in("id", cached.album_ids),
    );
    return cached.album_ids
      .map((id) => albums.find((album) => album.id === id))
      .filter(Boolean);
  }
  const delay = checked(await admin.rpc("reserve_catalog_slot"));
  await sleep(delay);
  // Escape Lucene operators; users search literal title/artist text, not arbitrary queries.
  const literal = query.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, "\\$1");
  const request = new URL("https://musicbrainz.org/ws/2/release-group");
  request.search = new URLSearchParams({
    query: `(releasegroup:("${literal}") OR artist:("${literal}")) AND (primarytype:album OR primarytype:ep) AND status:official AND NOT (secondarytype:live OR secondarytype:compilation OR secondarytype:remix OR secondarytype:"dj-mix")`,
    fmt: "json",
    limit: "24",
  }).toString();
  const response = await fetch(request, {
    headers: {
      "User-Agent":
        process.env.MUSICBRAINZ_USER_AGENT ||
        "Reverb/0.1.1 (local personal development)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(
      "Le catalogue est momentanément indisponible. Réessayez plus tard.",
    );
  const data = await response.json();
  const entries = (data["release-groups"] ?? [])
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
      artist: (group["artist-credit"] ?? [])
        .map((credit) => credit.name + (credit.joinphrase ?? ""))
        .join(""),
      kind: group["primary-type"],
      release_date: group["first-release-date"] ?? "",
      source_url: `https://musicbrainz.org/release-group/${group.id}`,
      fetched_at: new Date().toISOString(),
    }));
  const albums = entries.length
    ? checked(
        await admin
          .from("albums")
          .upsert(entries, { onConflict: "mbid" })
          .select(),
      )
    : [];
  const ordered = entries
    .map((entry) => albums.find((album) => album.mbid === entry.mbid))
    .filter(Boolean);
  checked(
    await admin
      .from("catalog_cache")
      .upsert({
        query: cacheKey,
        album_ids: ordered.map((album) => album.id),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }),
  );
  return ordered;
}
