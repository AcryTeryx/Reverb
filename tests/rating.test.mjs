import { test } from "node:test";
import assert from "node:assert/strict";
import { clickStar, formatRating } from "../apps/client/src/lib/rating.ts";
test("a repeated third star switches from 3 to 2.5, then back to 3", () => {
  const initial = clickStar(null, 3);
  assert.equal(initial, 6);
  assert.equal(clickStar(initial, 3), 5);
  assert.equal(clickStar(5, 3), 6);
});
test("no star interaction stores zero; the first half star is 0.5", () => {
  assert.equal(clickStar(2, 1), 1);
  assert.equal(clickStar(null, 5), 10);
  assert.throws(() => clickStar(null, 0));
  assert.equal(formatRating(5), "2,5 / 5");
});
