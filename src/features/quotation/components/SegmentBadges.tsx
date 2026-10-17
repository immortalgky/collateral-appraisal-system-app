import { useTranslation } from 'react-i18next';

import { useSegmentLabel } from '../hooks/useSegmentLabel';
import { buildSegmentSet } from '../utils/segmentCoverage';

interface SegmentChipsProps {
  segments: ReadonlyArray<string> | null | undefined;
  /** Segments to render as missing (amber) instead of neutral — case-insensitive. */
  highlight?: ReadonlyArray<string>;
  className?: string;
}

/** Banking Segment codes as small chips; renders "-" when there are none. */
export function SegmentChips({ segments, highlight = [], className }: SegmentChipsProps) {
  const label = useSegmentLabel();
  const flagged = new Set(highlight.map(h => h.trim().toLowerCase()));
  // Some callers pass raw, unvalidated data (e.g. a company's admin-entered LoanTypes) that can
  // contain case/whitespace duplicates — dedupe so React keys stay unique and chips aren't repeated.
  const deduped = buildSegmentSet(segments ?? []);

  if (deduped.length === 0) return <span className="text-gray-400">-</span>;

  return (
    <span className={`inline-flex flex-wrap gap-1 ${className ?? ''}`}>
      {deduped.map(s => (
        <span
          key={s}
          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            flagged.has(s.trim().toLowerCase())
              ? 'bg-amber-100 text-amber-800'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {label(s)}
        </span>
      ))}
    </span>
  );
}

/** Amber "Missing IBG" badge; renders nothing when the company covers the Segment Set. */
export function MissingSegmentsBadge({
  missing,
  className,
}: {
  missing: ReadonlyArray<string>;
  className?: string;
}) {
  const { t } = useTranslation('quotation');
  const label = useSegmentLabel();
  if (missing.length === 0) return null;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 ${className ?? ''}`}
    >
      {t('segment.missing', { segments: missing.map(label).join(', ') })}
    </span>
  );
}
