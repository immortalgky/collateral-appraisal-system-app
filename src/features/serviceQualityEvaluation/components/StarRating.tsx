import Icon from '@shared/components/Icon';

interface StarRatingProps {
  /** 0–5 numeric score. Half-star kicks in at fractional ≥ 0.5. */
  score: number;
  /** Tailwind size class for each star. Default: `size-3.5`. */
  size?: string;
}

/**
 * 5-star visualisation of a 0–5 score. Never rounds UP to a full star — a fully-lit
 * star always reflects an integer value at that rank.
 *   frac < 0.25 → no half star (e.g. 4.1 → 4)
 *   frac ≥ 0.25 → half star    (e.g. 4.4 → 4.5, 4.99 → 4.5)
 *   frac == 0   → full star    (e.g. 5.0 → 5)
 *
 * - Full star: amber-400 solid
 * - Half star: amber-400 solid (star-half-stroke)
 * - Empty star: gray-300 regular
 */
function StarRating({ score, size = 'size-3.5' }: StarRatingProps) {
  const full = Math.floor(score);
  const frac = score - full;
  const hasHalf = frac >= 0.25;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        if (i <= full) {
          return <Icon key={i} name="star" style="solid" className={`${size} text-amber-400`} />;
        }
        if (i === full + 1 && hasHalf) {
          return (
            <Icon
              key={i}
              name="star-half-stroke"
              style="solid"
              className={`${size} text-amber-400`}
            />
          );
        }
        return <Icon key={i} name="star" style="regular" className={`${size} text-gray-300`} />;
      })}
    </span>
  );
}

export default StarRating;
