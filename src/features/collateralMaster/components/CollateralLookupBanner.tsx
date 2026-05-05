import Icon from '@shared/components/Icon';
import { formatLocaleDate } from '@shared/utils/dateUtils';
import { useTranslation } from 'react-i18next';
import type { CollateralLookupResult } from '../api/types';

interface CollateralLookupBannerProps {
  result: CollateralLookupResult;
  onUsePriorData: () => void;
  onDismiss: () => void;
}

/**
 * "Previously appraised" info banner shown when the lookup finds an existing
 * collateral master for the identity fields the user just entered.
 *
 * Shows appraisal count, last date, last value, prior companies.
 * "Use prior data" prefills the form from the master; "×" dismisses without prefilling.
 */
export function CollateralLookupBanner({
  result,
  onUsePriorData,
  onDismiss,
}: CollateralLookupBannerProps) {
  const { i18n } = useTranslation();
  const { master, lastEngagement } = result;

  const detail =
    master.landDetail ??
    master.condoDetail ??
    master.leaseholdDetail ??
    master.machineDetail;

  const lastValue =
    (master.landDetail?.lastTotalAppraisedValue ?? master.landDetail?.lastAppraisedValue) ||
    (detail as any)?.lastAppraisedValue;

  const lastDate = (detail as any)?.lastAppraisedDate ?? lastEngagement?.appraisalDate;

  const isUnderConstruction =
    master.collateralType === 'Land' && master.landDetail?.isUnderConstructionAtLastAppraisal;

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <Icon name="clock-rotate-left" style="solid" className="size-4 text-blue-600" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-blue-800 leading-tight">Previously appraised</p>

        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-700">
          {lastEngagement && (
            <span>
              <span className="font-medium">Appraisals:</span>{' '}
              {result.priorAppraisalCompanyIds.length} prior{' '}
              {result.priorAppraisalCompanyIds.length === 1 ? 'company' : 'companies'}
            </span>
          )}
          {lastDate && (
            <span>
              <span className="font-medium">Last appraisal:</span>{' '}
              {formatLocaleDate(lastDate, i18n.language)}
            </span>
          )}
          {lastValue != null && (
            <span>
              <span className="font-medium">Last value:</span>{' '}
              ฿{lastValue.toLocaleString('th-TH')}
            </span>
          )}
          {master.ownerName && (
            <span>
              <span className="font-medium">Owner:</span> {master.ownerName}
            </span>
          )}
          {isUnderConstruction && master.landDetail?.overallConstructionProgressPercent != null && (
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <Icon name="hard-hat" style="solid" className="size-3" />
              Under construction (
              {master.landDetail.overallConstructionProgressPercent.toFixed(1)}%)
            </span>
          )}
        </div>

        {result.priorAppraisalCompanyIds.length > 0 && (
          <p className="mt-1 text-xs text-blue-600">
            Prior company IDs will be sent to the workflow for appeal exclusion.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={onUsePriorData}
          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          Use prior data
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
          title="Dismiss"
        >
          <Icon name="xmark" style="solid" className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export default CollateralLookupBanner;
