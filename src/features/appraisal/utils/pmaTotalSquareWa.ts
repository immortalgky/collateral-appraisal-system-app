/**
 * The land+building PMA form's read-only Total Sq.Wa: Rai × 400 + Ngan × 100 + Sq.Wa, to 2 dp.
 *
 * One function for both the form effect that keeps it in sync and the response mapper that seeds
 * it, so a loaded record already holds the total the form will show and the two cannot drift.
 */
export const pmaTotalSquareWa = (rai: unknown, ngan: unknown, squareWa: unknown): number =>
  Math.round(
    ((Number(rai) || 0) * 400 + (Number(ngan) || 0) * 100 + (Number(squareWa) || 0)) * 100,
  ) / 100;
