import type { ReactNode } from 'react';
import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/Button';
import { formatNumber } from '@/shared/utils/formatUtils';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import type { ExternalCompany, PreviousCompany } from '../types/administration';
import type { FeePreview } from '../types/feePreview';

interface ChangeCompanyDialogProps {
  previousCompany: PreviousCompany;
  /** Its Thai name when known (the defaults response carries only the English one). */
  previousCompanyNameLocal?: string | null;
  /** The company the admin picked instead; the dialog is open while this is set. */
  newCompany: ExternalCompany | null;
  /**
   * The page's fee preview for a manual external assignment (the company does not change it: the
   * backend reads it only for quotations). Undefined while it loads or does not apply.
   */
  feePreview: FeePreview | undefined;
  /** The preview failed to load (as opposed to still loading): say so instead of "loading". */
  feeError?: boolean;
  /** The "keep the previous company" button. */
  onKeepPrevious: () => void;
  /** Esc or the backdrop: leave the question without choosing. */
  onCancel: () => void;
  onConfirm: () => void;
}

function CompanyCard({
  label,
  tone,
  children,
}: {
  label: string;
  tone: 'neutral' | 'purple';
  children: ReactNode;
}) {
  return (
    <div
      className={
        tone === 'purple'
          ? 'rounded-lg border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 px-3 py-2'
          : 'rounded-lg border border-(--palette-line) bg-(--palette-surface) px-3 py-2'
      }
    >
      <div className="text-xs text-(--palette-gray-500)">{label}</div>
      {children}
    </div>
  );
}

/** Asks before the admin moves a Construction Inspection off the company that did the last one. */
export default function ChangeCompanyDialog({
  previousCompany,
  previousCompanyNameLocal,
  newCompany,
  feePreview,
  feeError = false,
  onKeepPrevious,
  onCancel,
  onConfirm,
}: ChangeCompanyDialogProps) {
  const { t } = useTranslation('appraisal');
  const localizeCompanyName = useLocalizedCompanyName();
  // An admin's own base amount wins over whatever the system would charge, so it is the one to name.
  const adminAmount = feePreview?.adminOverrideAmount ?? null;

  // What the fee line says: still loading, failed, the admin's amount, or the agreed fee kept.
  const fee: ReactNode = !feePreview ? (
    feeError ? (
      <span className="text-danger">{t('feePreview.loadFailed')}</span>
    ) : (
      <span className="text-(--palette-gray-400)">{t('feePreview.loading')}</span>
    )
  ) : adminAmount != null ? (
    t('administration.changeCompany.feeAdmin', { amount: formatNumber(adminAmount, 2) })
  ) : feePreview.baseSource.kind === 'ConstructionInspectionFee' &&
    feePreview.systemBaseAmount != null ? (
    t('administration.changeCompany.feeKept', {
      amount: formatNumber(feePreview.systemBaseAmount, 2),
    })
  ) : null;

  return (
    <Dialog open={!!newCompany} onClose={onCancel} className="relative z-[60]">
      <DialogBackdrop className="fixed inset-0 bg-black/40" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel className="w-full max-w-[520px] rounded-2xl bg-(--palette-surface) shadow-xl">
          <div className="px-6 pt-5 pb-4">
            <DialogTitle as="h3" className="text-lg font-semibold text-(--palette-ink)">
              {t('administration.changeCompany.title')}
            </DialogTitle>
            <Description className="mt-1 text-xs text-pretty text-(--palette-gray-500)">
              {t('administration.changeCompany.description')}
            </Description>

            {/* Side by side; stacked on a narrow screen. */}
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <CompanyCard label={t('administration.changeCompany.previous')} tone="neutral">
                <div className="text-sm font-semibold text-(--palette-ink)">
                  {localizeCompanyName(previousCompany.companyName, previousCompanyNameLocal)}
                </div>
                <div className="text-xs text-(--palette-gray-500)">
                  {t('administration.previousCompany.book', {
                    appraisalNumber: previousCompany.appraisalNumber,
                  })}
                  {previousCompany.inspectionNumber != null && (
                    <>
                      {' · '}
                      {t('administration.previousCompany.inspection', {
                        n: previousCompany.inspectionNumber,
                      })}
                    </>
                  )}
                </div>
              </CompanyCard>
              {newCompany && (
                <CompanyCard label={t('administration.changeCompany.selected')} tone="purple">
                  <div className="text-sm font-semibold text-(--palette-ink)">
                    {localizeCompanyName(newCompany.companyName, newCompany.companyNameLocal)}
                  </div>
                </CompanyCard>
              )}
            </div>

            {(newCompany ? fee : null) && (
              <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-(--palette-line-soft) pt-3 text-xs text-(--palette-gray-600)">
                <span className="shrink-0">{t('administration.changeCompany.fee')}</span>
                <span className="text-right">{fee}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-(--palette-line-soft) px-6 py-3">
            <Button type="button" variant="outline" onClick={onKeepPrevious}>
              {t('administration.changeCompany.keepPrevious')}
            </Button>
            <Button type="button" onClick={onConfirm}>
              {t('administration.changeCompany.confirm')}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
