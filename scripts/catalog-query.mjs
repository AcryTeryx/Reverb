export const PAGE_SIZE = 50;
export function normalizeQuery(query) {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}
export function catalogOptions(raw, options = {}) {
  const query = normalizeQuery(raw);
  const type = options.type ?? "albums";
  const scope = options.scope ?? "all";
  const offset = Number(options.offset ?? 0);
  if (query.length < 2 || query.length > 100)
    throw new Error("Saisissez entre 2 et 100 caractères.");
  if (
    !["albums", "recordings"].includes(type) ||
    !["all", "title", "artist"].includes(scope) ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 2147483597
  )
    throw new Error("Saisissez des filtres de recherche valides.");
  return { query, type, scope, offset };
}
export function buildCatalogQuery({ query, type, scope }) {
  const title = type === "albums" ? "releasegroup" : "recording";
  // Quote each term so user input cannot inject Lucene operators.
  const terms = query
    .split(" ")
    .map((word) => `"${word.replace(/([\\"])/g, "\\$1")}"`);
  const text = terms
    .map((term) =>
      scope === "title"
        ? `${title}:${term}`
        : scope === "artist"
          ? `artist:${term}`
          : `(${title}:${term} OR artist:${term})`,
    )
    .join(" AND ");
  return type === "albums"
    ? `(${text}) AND (primarytype:album OR primarytype:ep) AND status:official AND NOT (secondarytype:live OR secondarytype:compilation OR secondarytype:remix OR secondarytype:"dj-mix")`
    : `(${text})`;
}
