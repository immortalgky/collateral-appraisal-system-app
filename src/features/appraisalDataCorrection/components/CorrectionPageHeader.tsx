import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/Button';
import Badge from '@/shared/components/Badge';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import { formatLocaleDate } from '@/shared/utils/dateUtils';

interface CorrectionPageHeaderProps {
  appraisalNumber?: string | null;
  customerName?: string | null;
  status?: string | null;
  approvedAt?: string | null;
  /** Null when the appraisal has no source system to notify. */
  externalSystem: string | null;
  /** Undefined until the history has loaded, so a pending fetch does not read as "never edited". */
  editCount: number | undefined;
  latestEditAt?: string;
  onOpenHistory: () => void;
}

/** The appraisal's context, shown once for every pane below it. */
const CorrectionPageHeader = ({
  appraisalNumber,
  customerName,
  status,
  approvedAt,
  externalSystem,
  editCount,
  latestEditAt,
  onOpenHistory,
}: CorrectionPageHeaderProps) => {
  const { t, i18n } = useTranslation('appraisalDataCorrection');

  const latestAt = latestEditAt ? formatLocaleDate(latestEditAt, i18n.language) : null;
  const editSummary =
    // Zero and "not loaded yet" both give `none`; the span below renders only once loaded.
    editCount
      ? [t('edits.count', { count: editCount }), latestAt && t('header.latest', { at: latestAt })]
          .filter(Boolean)
          .join(' · ')
      : t('edits.none');

  // House style: the shared SectionHeader for the title, context and actions on its right
  // (same pattern as OAuthClientListPage) — never a custom, bigger title.
  return (
    <div className="shrink-0 flex min-h-[3.6923rem] flex-wrap items-center gap-x-[1.0769rem] gap-y-[0.4615rem] border-b border-[color:var(--dc-line)] bg-[color:var(--dc-surface)] px-[0.9231rem] py-[0.4615rem]">
      <SectionHeader
        className="!mb-0 shrink-0"
        title={appraisalNumber ?? ''}
        subtitle={customerName ?? undefined}
        icon="pen-to-square"
        iconColor="teal"
      />
      <div className="flex flex-1 flex-wrap items-center gap-x-[1.0769rem] gap-y-[0.4615rem]">
        {status && (
          <Badge type="status" value={status} size="xs">
            {status}
          </Badge>
        )}
        {approvedAt && (
          <span className="text-[0.9231rem] tabular-nums text-[color:var(--dc-ink-2)]">
            {t('header.approved', { at: formatLocaleDate(approvedAt, i18n.language) })}
          </span>
        )}
        {externalSystem && (
          <span className="inline-flex items-center gap-1.5 text-[0.9231rem] tabular-nums text-[color:var(--dc-ink-2)]">
            {t('header.sourceSystem')}
            <span className="rounded bg-[color:var(--dc-surface-3)] px-[0.3846rem] text-[0.7692rem] font-semibold leading-[1.2308rem] text-[color:var(--dc-ink-2)]">
              {externalSystem}
            </span>
          </span>
        )}
        {editCount !== undefined && (
          <span className="text-[0.9231rem] tabular-nums text-[color:var(--dc-ink-2)]">
            {editSummary}
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-auto dark:text-[color:var(--dc-ink)]"
        onClick={onOpenHistory}
      >
        {t('history.title')}
        {!!editCount && (
          <span className="ml-[0.4615rem] rounded-full bg-[color:var(--dc-accent-wash)] px-[0.4615rem] text-center text-[0.8077rem] font-semibold leading-[1.2308rem] text-[color:var(--dc-accent-ink)]">
            {editCount}
          </span>
        )}
      </Button>
    </div>
  );
};

export default CorrectionPageHeader;
