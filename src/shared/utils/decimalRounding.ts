/**
 * The backend does its money arithmetic in decimal; doubles carry noise (50,250 x 20.15 comes out
 * as 1,012,537.4999999999), which flips a half-baht rounding. Snapping to 6 decimal places first
 * removes the noise. Use it on every product or difference before it is rounded or compared.
 */
// `+ 0`: Math.round(-0.4) is -0, which would render as "-0.00"; -0 + 0 is +0.
export const snap = (v: number): number => Math.round(v * 1e6) / 1e6 + 0;

/**
 * Mirror of C# Math.Round(value / step, MidpointRounding.AwayFromZero) * step: halves round away
 * from zero (Math.round alone rounds -2.5 to -2).
 */
export const roundAwayFromZero = (value: number, step = 1): number => {
  const abs = Math.abs(snap(value));
  // A fractional step (0.01) goes through its reciprocal: dividing by 0.01 is itself inexact.
  const scale = step < 1 ? Math.round(1 / step) : 0;
  // The scaled product is snapped too: abs x 100 carries its own noise (4,252,575.015 x 100 is
  // 425,257,501.49999994). Exact for |value| below about 6.7e7 (2^26): past that a double no longer
  // holds a half cent at all, so no algorithm can recover it.
  const rounded = scale
    ? Math.floor(snap(abs * scale) + 0.5) / scale
    : Math.floor(abs / step + 0.5) * step;
  // `+ 0` turns the -0 of a small negative rounding to nothing into +0 (it would render as "-0.00").
  return (value < 0 ? -rounded : rounded) + 0;
};

/**
 * Truncation toward zero to a step (C# `Math.Truncate(value / step) * step`): 1,369,326.129 at two
 * decimals is 1,369,326.12, -1.129 is -1.12. Snapped like roundAwayFromZero, so 0.29 x 100 does not
 * truncate to 28.
 */
export const truncateTowardZero = (value: number, step = 1): number => {
  const abs = Math.abs(snap(value));
  const scale = step < 1 ? Math.round(1 / step) : 0;
  const truncated = scale
    ? Math.floor(snap(abs * scale)) / scale
    : Math.floor(snap(abs / step)) * step;
  return (value < 0 ? -truncated : truncated) + 0;
};
