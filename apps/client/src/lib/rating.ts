/** Integer half-stars; null is the only unrated value. */
export function clickStar(current: number | null, star: number): number {
  if (!Number.isInteger(star) || star < 1 || star > 5)
    throw new Error("Invalid star");
  return current === star * 2 ? star * 2 - 1 : star * 2;
}
export function formatRating(value: number) {
  return `${(value / 2).toLocaleString("fr-FR")} / 5`;
}
