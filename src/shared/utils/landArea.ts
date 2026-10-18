/** Thai land area: 1 rai = 4 ngan = 400 square wa, so 1 ngan = 100 square wa. */
const SQ_WA_PER_RAI = 400;
const SQ_WA_PER_NGAN = 100;

/**
 * An area given as rai, ngan and square wa, as square wa. Blank, null and non-numeric parts count
 * as zero, so a half-filled area totals what is filled.
 */
export const toSquareWa = (rai: unknown, ngan: unknown, squareWa: unknown): number =>
  (Number(rai) || 0) * SQ_WA_PER_RAI +
  (Number(ngan) || 0) * SQ_WA_PER_NGAN +
  (Number(squareWa) || 0);
