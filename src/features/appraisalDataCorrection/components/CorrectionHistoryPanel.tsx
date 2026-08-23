import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';
import type { PropertyGroupItemDtoType } from '@shared/schemas/v1';
import { useGetPropertyCorrections } from '../api/appraisalDataCorrection';

interface CorrectionHistoryPanelProps {
  appraisalId: string;
  /**
   * Every property on the appraisal, used to label each entry. The history is deliberately
   * NOT filtered to the selected property: corrections usually come in batches across
   * several properties of the same appraisal, and making the admin click through each one
   * to reconstruct what happened defeats the point of having an audit trail.
   */
  properties: PropertyGroupItemDtoType[];
}

const CorrectionHistoryPanel = ({ appraisalId, properties }: CorrectionHistoryPanelProps) => {
  const { t, i18n } = useTranslation('appraisalDataCorrection');
  const { data, isLoading } = useGetPropertyCorrections(appraisalId);

  const propertyNameById = useMemo(
    () => new Map(properties.map(p => [p.propertyId, p.propertyName])),
    [properties],
  );

  const corrections = data?.corrections ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" style="solid" className="size-5 text-primary animate-spin" />
      </div>
    );
  }

  if (corrections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Icon style="regular" name="clock-rotate-left" className="size-8 text-gray-300" />
        <p className="text-sm text-gray-500">{t('history.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {corrections.map(correction => (
        <div key={correction.id} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-medium text-gray-700 truncate">
              {propertyNameById.get(correction.appraisalPropertyId) || t('detail.unnamedProperty')}
            </span>
            <span className="text-[11px] text-gray-400 shrink-0">
              {formatLocaleDateTime(correction.changedAt, i18n.language)}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mb-1">{correction.changedBy}</p>
          <p className="text-xs text-gray-600 italic mb-2">&ldquo;{correction.reason}&rdquo;</p>
          <div className="space-y-1">
            {correction.changes.map((change, idx) => (
              <div key={`${correction.id}-${idx}`} className="text-[11px] flex items-start gap-1.5">
                <span className="font-medium text-gray-600 shrink-0">{change.field}:</span>
                <span className="text-gray-400 line-through">{change.from ?? '—'}</span>
                <span className="text-gray-400" aria-hidden="true">
                  →
                </span>
                <span className="text-gray-800">{change.to ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CorrectionHistoryPanel;
