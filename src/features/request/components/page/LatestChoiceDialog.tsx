import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { formatDate } from '@/shared/utils/dateUtils';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import type {
  ConstructionChainStatus,
  PriorAppraisal,
} from '@/features/appraisal/api/priorAppraisal';

export interface LatestChoice {
  /** The appraisal the maker picked, which is not the newest of its chain. */
  template: PriorAppraisal;
  chain: ConstructionChainStatus;
}

interface LatestChoiceDialogProps {
  /** What was picked and what the chain says; null keeps the dialog closed. */
  choice: LatestChoice | null;
  /** Escape or the backdrop: nothing is picked. */
  onClose: () => void;
  onUseSelected: (choice: LatestChoice) => void;
  onUseLatest: (latestAppraisalId: string) => void;
}

/**
 * A construction-inspection pick that is not the newest appraisal of its chain: copying from it is
 * allowed (a re-appraisal after it does not stop an inspection), so the maker is asked once which of
 * the two to copy from. It has two answers and no Cancel; closing it picks nothing.
 */
const LatestChoiceDialog = ({
  choice,
  onClose,
  onUseSelected,
  onUseLatest,
}: LatestChoiceDialogProps) => {
  const { t } = useTranslation('request');
  const latest = choice?.chain.latestAppraisal ?? null;
  const latestPurpose = useParameterDescription('AppraisalPurpose', latest?.purposeCode);

  const template = choice?.template;
  // Each row shows that appraisal's own figure, or says it has none: never one taken from the chain.
  // undefined = field absent (older API): show nothing; null = no data; number = the figure.
  const progressOf = (pct: number | null | undefined) => {
    if (pct === undefined) return null;
    return pct === null
      ? t('constructionGuard.noData')
      : t('constructionGuard.dialog.construction', {
          pct: formatNumber(pct, Number.isInteger(pct) ? 0 : 2),
        });
  };
  const latestProgress = latest && progressOf(latest.progressPct);
  const selected = [
    template?.appraisalDate && formatDate(template.appraisalDate, 'dd/MM/yyyy'),
    choice?.chain.selected && progressOf(choice.chain.selected.progressPct),
  ].filter(Boolean);

  return (
    <ConfirmDialog
      isOpen={!!choice && !!latest}
      onClose={onClose}
      onConfirm={onClose}
      title={t('constructionGuard.dialog.title')}
      variant="warning"
      hasWarning
      customFooter={
        choice &&
        latest && (
          <>
            <Button variant="outline" className="flex-1" onClick={() => onUseSelected(choice)}>
              {t('constructionGuard.dialog.useSelected', { no: choice.template.appraisalNumber })}
            </Button>
            <Button className="flex-1" onClick={() => onUseLatest(latest.appraisalId)}>
              {t('constructionGuard.dialog.useLatest', { latest: latest.appraisalNumber })}
            </Button>
          </>
        )
      }
    >
      <p className="mb-3 text-sm text-gray-500">{t('constructionGuard.dialog.message')}</p>
      <dl className="m-0 overflow-hidden rounded-lg border border-gray-200 text-left text-sm">
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 border-b border-gray-100 px-3.5 py-2.5">
          <dt className="text-gray-500">{t('constructionGuard.dialog.selectedLabel')}</dt>
          <dd className="m-0 text-gray-700">
            <strong className="font-semibold text-gray-900">{template?.appraisalNumber}</strong>
            {selected.map(part => ` · ${part}`).join('')}
          </dd>
        </div>
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 bg-primary-50 px-3.5 py-2.5">
          <dt className="text-gray-500">{t('constructionGuard.dialog.latestLabel')}</dt>
          <dd className="m-0 text-gray-700">
            <strong className="font-semibold text-gray-900">{latest?.appraisalNumber}</strong>
            {` · ${latestPurpose} · ${latest ? formatDate(latest.completedAt, 'dd/MM/yyyy') : ''}`}
            {latestProgress && ` · ${latestProgress}`}
          </dd>
        </div>
      </dl>
    </ConfirmDialog>
  );
};

export default LatestChoiceDialog;
