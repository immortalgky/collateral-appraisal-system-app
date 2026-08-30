/**
 * Whole baht, halves rounded up — the rule the server applies in
 * Appraisal.Domain.Appraisals.ConstructionMoney when it computes and persists a construction
 * inspection's figures (CA-614).
 *
 * The inspection screen does not display what the API returns: it recomputes every money column
 * from the 100% base and the entered percentages as the inspector types, so it has to apply the
 * same rule, in the same order as ConstructionWorkDetail.ComputeValues, or the screen and the saved
 * record disagree. The save payload has to send the same rounded 100% base for the same reason.
 *
 * The toFixed is not cosmetic. The server rounds decimals, this rounds doubles, and the two part
 * company at exact half-baht boundaries: 12,979,700 x 28.5% is 3,699,214.5, which the server rounds
 * up to 3,699,215 while a bare Math.round on the double sees 3,699,214.4999999 and rounds down.
 * Every value passed here is a whole-baht figure times a four-decimal percentage over a hundred, so
 * it carries at most six decimals and snapping to six sheds the float error without touching any
 * real value. Checked against exact integer arithmetic over 400k random inputs and every
 * constructible half-baht boundary: no disagreement with the server in either set.
 *
 * Math.round breaks ties toward +∞ where the server breaks them away from zero. The two differ only
 * for negative half-baht values, and none of these figures can be negative: they are a non-negative
 * base times a percentage the form holds at 0 or above.
 */
export const roundBaht = (value: number) => Math.round(Number(value.toFixed(6)));
