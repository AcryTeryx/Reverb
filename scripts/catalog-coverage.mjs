import { searchCatalog } from "./catalog.mjs";
import { writeFile, mkdir } from "node:fs/promises";
const artists = [
  "bladee",
  "ecco2k",
  "Yung Lean",
  "2hollis",
  "Daft Punk",
  "Metronomy",
  "Snow Strippers",
  "KETTAMA",
  "La Rvfleuze",
  "Mitski",
  "fakemink",
];
const coverage = [];
for (const artist of artists) {
  const row = { artist };
  for (const type of ["albums", "recordings"]) {
    try {
      const result = await searchCatalog(artist, { type, scope: "artist" });
      row[type] = {
        total: result.total,
        imported: result[type].length,
        nextOffset: result.nextOffset,
        sample: result[type]
          .slice(0, 2)
          .map(({ title, artist, mbid }) => ({ title, artist, mbid })),
      };
      // Exercise pagination on one artist with enough recordings, not a bulk crawl.
      if (
        artist === "bladee" &&
        type === "recordings" &&
        result.nextOffset !== null
      ) {
        const more = await searchCatalog(artist, {
          type,
          scope: "artist",
          offset: result.nextOffset,
        });
        row.pagination = {
          nextPage: more.recordings.length,
          duplicates: more.recordings.filter((r) =>
            result.recordings.some((p) => p.id === r.id),
          ).length,
        };
      }
    } catch (e) {
      row[type] = { error: e.message };
    }
  }
  coverage.push(row);
  console.log(JSON.stringify(row));
}
await mkdir(new URL("../.artifacts/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../.artifacts/catalog-coverage.json", import.meta.url),
  JSON.stringify(coverage, null, 2),
);
if (coverage.some((row) => row.albums.error || row.recordings.error))
  process.exitCode = 1;
