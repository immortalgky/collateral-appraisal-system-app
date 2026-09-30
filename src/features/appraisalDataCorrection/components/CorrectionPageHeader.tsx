import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
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
    <div className="shrink-0 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-primary/20 bg-gradient-to-r from-primary/15 to-primary/5 px-5 py-3.5">
      <SectionHeader
        className="!mb-0"
        title={appraisalNumber ?? ''}
        subtitle={customerName ?? undefined}
        icon="pen-to-square"
        iconColor="teal"
      />
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        {status && (
          <Badge type="status" value={status} size="xs">
            {status}
          </Badge>
        )}
        {approvedAt && (
          <span className="text-xs text-gray-500">
            {t('header.approved', { at: formatLocaleDate(approvedAt, i18n.language) })}
          </span>
        )}
        {externalSystem && (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            {t('header.sourceSystem')}
            <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
              {externalSystem}
            </span>
          </span>
        )}
        {editCount !== undefined && <span className="text-xs text-gray-500">{editSummary}</span>}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-auto bg-white shadow-sm"
        onClick={onOpenHistory}
      >
        <Icon style="regular" name="clock" className="size-3.5 mr-1.5" />
        {t('history.title')}
        {!!editCount && (
          <span className="ml-2 min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-bold leading-5 text-white">
            {editCount}
          </span>
        )}
      </Button>
    </div>
  );
};

export default CorrectionPageHeader;
