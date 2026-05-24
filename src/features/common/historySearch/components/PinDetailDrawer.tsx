import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnyPin, CollateralPinDto, MarketComparablePinDto } from '../types';
import { isCollateralPin } from '../types';
import { ComparisonTable } from './ComparisonTable';
import { formatNumber } from '@shared/utils/formatUtils';
import { useGetMarketComparableById } from '@features/appraisal/api/marketComparable';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';
import { useLocaleStore } from '@shared/store';
import ParameterDisplay from '@shared/components/ParameterDisplay';

interface PinDetailDrawerProps {
  pin: AnyPin | null;
  onClose: () => void;
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-3 text-sm">
      <span className="text-gray-500 shrink-0 text-xs">{label}</span>
      <span className={['text-gray-800 text-right break-all', mono ? 'tabular-nums' : ''].join(' ')}>
        {value}
      </span>
    </div>
  );
}

// ─── Collateral detail ────────────────────────────────────────────────────────

function CollateralDetail({ pin }: { pin: CollateralPinDto }) {
  const { t } = useTranslation('historySearch');
  const locationParts = [pin.subDistrict, pin.district, pin.province].filter(Boolean);
  const location = locationParts.join(', ') || t('common.na');

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
        <h4 className="text-sm font-semibold text-gray-800">{t('pinDetail.collateral.title')}</h4>
      </div>

      <Row label={t('pinDetail.collateral.collateralType')} value={pin.collateralType ?? t('common.na')} />
      <Row label={t('pinDetail.collateral.propertyType')} value={pin.propertyType ?? t('common.na')} />
      <Row label={t('pinDetail.collateral.engagementCount')} value={String(pin.engagementCount)} />
      <Row
        label={t('pinDetail.collateral.lastAppraisedDate')}
        value={pin.lastAppraisedDate
          ? new Date(pin.lastAppraisedDate).toLocaleDateString('en-GB')
          : t('common.na')}
      />
      <Row
        label={t('pinDetail.collateral.lastAppraisedValue')}
        value={pin.lastAppraisedValue != null ? formatNumber(pin.lastAppraisedValue, 0) : t('common.na')}
        mono
      />
      <Row label={t('pinDetail.collateral.location')} value={location} />
      <Row label={t('pinDetail.collateral.distance')} value={pin.distanceKm != null ? `${pin.distanceKm.toFixed(2)} km` : '—'} mono />
    </div>
  );
}

// ─── Survey Factors section ───────────────────────────────────────────────────

interface FactorDataDto {
  factorId: string;
  factorCode: string;
  fieldName: string;
  dataType: string;
  fieldDecimal: number | null;
  parameterGroup: string | null;
  value: string | null;
  otherRemarks: string | null;
  translations: { language: string; factorName: string }[];
}

function SurveyFactorsSection({ marketComparableId }: { marketComparableId: string }) {
  const { t } = useTranslation('historySearch');
  const language = useLocaleStore(s => s.language);
  const { data, isLoading, isError } = useGetMarketComparableById(marketComparableId);

  const factors: FactorDataDto[] = data?.marketComparable?.factorData ?? [];

  if (isLoading) {
    return (
      <div className="mt-1 flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t('pinDetail.marketComparable.factors')}
        </p>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 rounded bg-gray-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || factors.length === 0) return null;

  return (
    <div className="mt-1 flex flex-col gap-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t('pinDetail.marketComparable.factors')}
      </p>
      {factors.map(factor => {
        const label = getTranslatedFactorName(factor.translations, language) || factor.fieldName;
        const na = t('common.na');

        const hasValue = !!factor.value;
        const isParameterized = hasValue && !!factor.parameterGroup;
        const isNumeric =
          hasValue &&
          !factor.parameterGroup &&
          factor.dataType === 'Numeric' &&
          !isNaN(Number(factor.value));

        return (
          <div key={factor.factorId} className="flex justify-between items-start gap-3 text-sm">
            <span className="text-gray-500 shrink-0 text-xs">{label}</span>
            <div className="text-gray-800 text-right break-all flex flex-col items-end gap-0.5">
              {isParameterized ? (
                <ParameterDisplay
                  group={factor.parameterGroup!}
                  code={factor.value}
                  fallback={na}
                  className="text-sm"
                />
              ) : (
                <span>
                  {isNumeric
                    ? formatNumber(Number(factor.value), factor.fieldDecimal ?? 0)
                    : factor.value || na}
                </span>
              )}
              {factor.otherRemarks && (
                <span className="text-xs text-gray-400 italic">{factor.otherRemarks}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Market Comparable detail ─────────────────────────────────────────────────

function MarketComparableDetail({
  pin,
  onViewComparison,
}: {
  pin: MarketComparablePinDto;
  onViewComparison: () => void;
}) {
  const { t } = useTranslation('historySearch');

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
        <h4 className="text-sm font-semibold text-gray-800">{t('pinDetail.marketComparable.title')}</h4>
      </div>

      <Row label={t('pinDetail.marketComparable.surveyName')} value={pin.surveyName} />
      <Row label={t('pinDetail.marketComparable.propertyType')} value={pin.propertyType} />
      <Row
        label={t('pinDetail.marketComparable.infoDateTime')}
        value={pin.infoDateTime
          ? new Date(pin.infoDateTime).toLocaleDateString('en-GB')
          : t('common.na')}
      />
      <Row
        label={t('pinDetail.marketComparable.offerPrice')}
        value={pin.offerPrice != null ? formatNumber(pin.offerPrice, 0) : t('common.na')}
        mono
      />
      <Row
        label={t('pinDetail.marketComparable.salePrice')}
        value={pin.salePrice != null ? formatNumber(pin.salePrice, 0) : t('common.na')}
        mono
      />
      <Row label={t('pinDetail.marketComparable.distance')} value={pin.distanceKm != null ? `${pin.distanceKm.toFixed(2)} km` : '—'} mono />

      <SurveyFactorsSection marketComparableId={pin.marketComparableId} />

      <button
        type="button"
        onClick={onViewComparison}
        className="mt-2 w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-sm font-medium py-2 rounded-lg transition-colors"
      >
        {t('pinDetail.marketComparable.viewComparison')}
      </button>
    </div>
  );
}

// ─── Drawer shell ─────────────────────────────────────────────────────────────

export function PinDetailDrawer({ pin, onClose }: PinDetailDrawerProps) {
  const { t } = useTranslation('historySearch');
  const [showComparison, setShowComparison] = useState(false);

  if (!pin) return null;

  const mcPin = !isCollateralPin(pin) ? pin : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl border-l border-gray-200 z-40 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={t('pinDetail.title')}
        data-testid="pin-detail-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-semibold text-gray-800">{t('pinDetail.title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
            aria-label={t('pinDetail.close')}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {showComparison && mcPin ? (
            <ComparisonTable
              pins={[mcPin]}
              onClose={() => setShowComparison(false)}
            />
          ) : isCollateralPin(pin) ? (
            <CollateralDetail pin={pin} />
          ) : (
            <MarketComparableDetail
              pin={pin}
              onViewComparison={() => setShowComparison(true)}
            />
          )}
        </div>
      </div>
    </>
  );
}
