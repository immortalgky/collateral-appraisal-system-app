/**
 * The land+building PMA form's read-only Total Sq.Wa: Rai × 400 + Ngan × 100 + Sq.Wa, to 2 dp.
 *
 * One function for both the form effect that keeps it in sync and the response mapper that seeds
 * it, so the two always agree. When the mapper left it out, the form wrote it after reset() and
 * every later whole-form isDirty check saw a difference no one had made.
 */
export const pmaTotalSquareWa = (rai: unknown, ngan: unknown, squareWa: unknown): number =>
  Math.round(
    ((Number(rai) || 0) * 400 + (Number(ngan) || 0) * 100 + (Number(squareWa) || 0)) * 100,
  ) / 100;
