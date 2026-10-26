import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { useSectionStatus } from './useSectionStatus';

// The amber of `MissingFieldsChip`, as a small pill.
const PILL =
  'whitespace-nowrap rounded-full border border-(--palette-warn) bg-(--palette-warn-wash) px-2 text-xs font-semibold leading-[1.125rem] tabular-nums text-(--palette-warn)';
const OK = 'text-green-700 dark:text-green-400';

/** End of a TOC row: a green tick when nothing is missing, else the amber "ขาด n" pill. */
export function SectionStatusMark({ count }: { count: number }) {
  const { t } = useTranslation('common');
  if (count > 0) return <span className={PILL}>{t('sectionToc.missing', { count })}</span>;
  return (
    <span role="img" aria-label={t('sectionToc.complete')} className={OK}>
      <Icon style="solid" name="check" className="size-3.5!" />
    </span>
  );
}

/**
 * The same status in a section's header, for a page with no TOC rail: the pill jumps to the first
 * missing field, a complete section says so quietly. Nothing without a summary.
 */
export function SectionHeaderStatus({ id }: { id: string }) {
  const { t } = useTranslation('common');
  const status = useSectionStatus()(id);
  if (!status) return null;
  if (status.count === 0)
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${OK}`}>
        <Icon style="solid" name="check" className="size-3!" />
        {t('sectionToc.complete')}
      </span>
    );
  return (
    <button
      type="button"
      onClick={status.jump}
      title={t('missing.goTo')}
      className={`${PILL} hover:bg-amber-100 dark:hover:bg-amber-500/20`}
    >
      {t('sectionToc.missing', { count: status.count })}
    </button>
  );
}
