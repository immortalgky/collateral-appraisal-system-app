import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import Badge from '@/shared/components/Badge';
import Icon from '@/shared/components/Icon';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';

import { useSegmentLabel } from '../hooks/useSegmentLabel';
import type { InvitedCompanyDto } from '../schemas/quotation';
import { buildSegmentSet } from '../utils/segmentCoverage';

interface SegmentChipsProps {
  segments: ReadonlyArray<string | null | undefined> | null | undefined;
  className?: string;
}

/** Banking Segment codes as small chips; renders an em dash when there are none. */
export function SegmentChips({ segments, className }: SegmentChipsProps) {
  const label = useSegmentLabel();
  // Some callers pass raw, unvalidated data (e.g. a company's admin-entered LoanTypes) that can
  // contain case/whitespace duplicates — dedupe so React keys stay unique and chips aren't repeated.
  const deduped = buildSegmentSet(segments ?? []);

  if (deduped.length === 0) return <span className="text-gray-400">—</span>;

  // One line (DESIGN.md §10): horizontal overflow is clipped (x only, so Thai tone marks are never
  // cut vertically); the full list stays available as a tooltip.
  return (
    <span
      className={clsx('inline-flex max-w-full min-w-0 gap-1 overflow-x-clip', className)}
      title={deduped.map(label).join(', ')}
    >
      {deduped.map(s => (
        <Badge key={s} tone="gray" dot={false} className="whitespace-nowrap">
          {label(s)}
        </Badge>
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
    <Badge tone="yellow" dot={false} className={clsx('whitespace-nowrap', className)}>
      {t('segment.missing', { segments: missing.map(label).join(', ') })}
    </Badge>
  );
}

/** Send-blocked alert: lists invited companies that miss part of the Segment Set; renders nothing without gaps. */
export function SegmentGapsAlert({
  gaps,
  className,
}: {
  gaps: ReadonlyArray<InvitedCompanyDto> | null | undefined;
  className?: string;
}) {
  const { t } = useTranslation('quotation');
  const label = useSegmentLabel();
  const localizeCompanyName = useLocalizedCompanyName();
  if (!gaps?.length) return null;

  return (
    <div
      role="status"
      className={clsx('flex items-start gap-2 bg-amber-50 text-amber-800', className)}
    >
      <Icon
        name="triangle-exclamation"
        style="solid"
        className="size-4! text-amber-500 shrink-0 mt-0.5"
      />
      <div>
        <p className="font-medium">{t('segment.sendBlockedTitle')}</p>
        <ul className="mt-1 list-disc pl-4">
          {gaps.map(c => (
            <li key={c.companyId}>
              {t('segment.sendBlockedItem', {
                company: localizeCompanyName(c.companyName, c.companyNameLocal),
                segments: (c.missingSegments ?? []).map(label).join(', '),
              })}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-amber-700">{t('segment.sendBlockedHint')}</p>
      </div>
    </div>
  );
}
