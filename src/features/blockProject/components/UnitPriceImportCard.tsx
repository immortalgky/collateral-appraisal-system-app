import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Button from '@/shared/components/Button';
import { FormCard } from '@/shared/components/sections';
import Icon from '@/shared/components/Icon';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';
import { errorText } from '@/shared/utils/errorUtils';

import { useDownloadUnitPriceTemplate } from '../api/projectUnitPrice';
import type { ProjectUnitPrice, UnitPriceSourceInfo } from '../types';

interface UnitPriceImportCardProps {
  appraisalId: string;
  source: UnitPriceSourceInfo | undefined;
  /** Undefined until the unit prices have loaded (or when they failed to). */
  unitPrices: ProjectUnitPrice[] | undefined;
  pricesLoading: boolean;
  isReadOnly: boolean;
  onUpload: () => void;
}

/** What the last import brought in, plus the two actions: get the template, upload a price list. */
export default function UnitPriceImportCard({
  appraisalId,
  source,
  unitPrices,
  pricesLoading,
  isReadOnly,
  onUpload,
}: UnitPriceImportCardProps) {
  const { t, i18n } = useTranslation('blockProject');
  const download = useDownloadUnitPriceTemplate();

  const priced = unitPrices?.filter(up => up.totalAppraisalValueRounded != null);
  const total = priced?.reduce((sum, up) => sum + (up.totalAppraisalValueRounded ?? 0), 0);
  // Figures that need the unit prices: a placeholder while they load, a dash if they never came,
  // never a 0 that reads as "nothing priced".
  const figure = (value: string | undefined) =>
    value !== undefined ? (
      value
    ) : pricesLoading ? (
      <span
        role="status"
        aria-label={t('unitPrice.import.loadingFigures')}
        className="inline-block h-5 w-16 animate-pulse rounded bg-gray-100"
      />
    ) : (
      '-'
    );

  const handleDownload = () =>
    download.mutate(
      { appraisalId },
      {
        onError: (err: unknown) =>
          toast.error(errorText(err, t('unitPrice.import.templateFailed'))),
      },
    );

  return (
    <FormCard
      title={t('unitPrice.import.cardTitle')}
      subtitle={t('unitPrice.import.hint')}
      icon="file-excel"
      iconColor="emerald"
      rightIcon={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            isLoading={download.isPending}
            title={t('unitPrice.import.downloadTemplateTitle')}
            leftIcon={<Icon name="download" style="solid" />}
          >
            {t('unitPrice.import.downloadTemplate')}
          </Button>
          {!isReadOnly && (
            <Button
              size="sm"
              onClick={onUpload}
              leftIcon={<Icon name="file-arrow-up" style="regular" />}
            >
              {t('unitPrice.import.upload')}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Metadata only while the server's prices really are an import: a local switch to this
          view over calculated prices must not show an old file as current. */}
        {source?.source === 'Imported' && source.fileName ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-gray-200 p-3">
              <span className="text-xs text-gray-500">{t('unitPrice.import.file')}</span>
              <span
                className="truncate text-sm font-semibold text-gray-800"
                title={source.fileName}
              >
                {source.fileName}
              </span>
              <span className="truncate text-xs text-gray-500">
                {[source.importedBy, formatLocaleDateTime(source.importedAt, i18n.language)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
              <span className="text-xs text-gray-500">{t('unitPrice.import.unitsPriced')}</span>
              <span className="text-base font-semibold text-gray-800 tabular-nums">
                {figure(
                  priced && unitPrices
                    ? `${priced.length.toLocaleString()} / ${unitPrices.length.toLocaleString()}`
                    : undefined,
                )}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3">
              <span className="text-xs text-gray-500">{t('unitPrice.import.totalValue')}</span>
              <span className="text-base font-semibold text-gray-800 tabular-nums">
                {figure(
                  total?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                )}
              </span>
            </div>
          </div>
        ) : source?.source === 'Imported' ? (
          // Imported, but the file's record is gone (the unit list was replaced): never "no price
          // file yet", which is what a project that was never imported says.
          <p className="text-xs text-gray-500">{t('unitPrice.import.fileUnknown')}</p>
        ) : (
          <p className="text-xs text-gray-500">{t('unitPrice.import.noFile')}</p>
        )}

        {unitPrices && priced && unitPrices.length > 0 && priced.length === 0 && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-gray-700"
          >
            <Icon name="triangle-exclamation" style="solid" className="mt-0.5 shrink-0" />
            <span>{t('unitPrice.import.emptyPrices')}</span>
          </div>
        )}
      </div>
    </FormCard>
  );
}
