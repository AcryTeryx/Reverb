import { searchCatalog } from "./catalog.mjs";
const query = process.argv[2] || "Daft Punk";
const { albums, total, nextOffset } = await searchCatalog(query);
if (!albums.length) throw new Error("Aucun résultat réel reçu.");
const cached = await searchCatalog(query);
if (cached.albums.length !== albums.length) throw new Error("Cache incohérent.");
console.log(
  JSON.stringify(
    {
      query,
      count: albums.length,
      total,
      nextOffset,
      cache: "ok",
      sample: albums
        .slice(0, 3)
        .map((a) => ({
          title: a.title,
          artist: a.artist,
          id: a.id,
          source: a.source_url,
        })),
    },
    null,
    2,
  ),
);
