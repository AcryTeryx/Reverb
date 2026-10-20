import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCatalogQuery,
  catalogOptions,
} from "../scripts/catalog-query.mjs";

test("catalogue accepts artists outside the initial sample and isolates literal input", () => {
  const input = catalogOptions("  New   Artist  ", {
    type: "recordings",
    scope: "artist",
    offset: 50,
  });
  assert.equal(input.query, "new artist");
  assert.equal(input.offset, 50);
  assert.equal(buildCatalogQuery(input), '(artist:"new" AND artist:"artist")');
  assert.ok(buildCatalogQuery(catalogOptions('a" OR *:*')).includes('"a\\""'));
  for (const offset of [-1, 0.5, "NaN", Infinity])
    assert.throws(() => catalogOptions("mitski", { offset }));
  assert.throws(() => catalogOptions("mitski", { type: "users" }));
});
