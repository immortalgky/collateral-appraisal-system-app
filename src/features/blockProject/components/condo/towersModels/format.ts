import { formatNumber } from '@/shared/utils/formatUtils';

/**
 * "a – b" with two decimals (34.00 – 35.50, 2,478,000.00 – 3,383,000.00), just "a" when both ends
 * are equal, null when neither is set.
 */
export function formatRange(min: number | undefined, max: number | undefined): string | null {
  if (!min && !max) return null;
  if (min && max && min !== max) return `${formatNumber(min, 2)} – ${formatNumber(max, 2)}`;
  return formatNumber((min || max) as number, 2);
}
