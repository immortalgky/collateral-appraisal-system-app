import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import type { HistorySearchFormValues } from '../types';

// Fields considered "attribute filters" (visible as chips).
// Center coords, radius, and period are structural — not shown as chips.
// province/district/subDistrict are independent cascade levels (partial search allowed).
type ChipField = keyof Pick<
  HistorySearchFormValues,
  | 'appraisalReportNo'
  | 'titleDeedNo'
  | 'collateralType'
  | 'customerName'
  | 'landAreaFromSqWa'
  | 'landAreaToSqWa'
  | 'valueFrom'
  | 'valueTo'
  | 'buildingTypeCodes'
  | 'province'
  | 'district'
  | 'subDistrict'
  | 'dateFrom'
  | 'dateTo'
>;

const CHIP_FIELDS: ChipField[] = [
  'appraisalReportNo',
  'titleDeedNo',
  'collateralType',
  'customerName',
  'landAreaFromSqWa',
  'landAreaToSqWa',
  'valueFrom',
  'valueTo',
  'buildingTypeCodes',
  'province',
  'district',
  'subDistrict',
  'dateFrom',
  'dateTo',
];

// Map form field → i18n key (reusing searchPanel.* labels)
const FIELD_I18N: Record<ChipField, string> = {
  appraisalReportNo: 'searchPanel.appraisalReportNo',
  titleDeedNo: 'searchPanel.titleDeedNo',
  collateralType: 'searchPanel.collateralType',
  customerName: 'searchPanel.customerName',
  landAreaFromSqWa: 'searchPanel.landAreaFromSqWa',
  landAreaToSqWa: 'searchPanel.landAreaToSqWa',
  valueFrom: 'searchPanel.valueFrom',
  valueTo: 'searchPanel.valueTo',
  buildingTypeCodes: 'searchPanel.buildingType',
  province: 'searchPanel.province',
  district: 'searchPanel.district',
  subDistrict: 'searchPanel.subDistrict',
  dateFrom: 'searchPanel.dateFrom',
  dateTo: 'searchPanel.dateTo',
};

function isFieldActive(field: ChipField, values: HistorySearchFormValues): boolean {
  const v = values[field];
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === 'string' && v.trim().length > 0;
}

// Renders the chip's value — codes mapped to descriptions / names for coded fields.
function fieldDisplayValue(field: ChipField, values: HistorySearchFormValues): ReactNode {
  const v = values[field];
  // Location levels show the resolved area name (auto-filled), falling back to the code.
  if (field === 'province') return values.provinceName?.trim() || String(v);
  if (field === 'district') return values.districtName?.trim() || String(v);
  if (field === 'subDistrict') return values.subDistrictName?.trim() || String(v);
  if (field === 'collateralType' && typeof v === 'string' && v) {
    return <ParameterDisplay group="PropertyType" code={v} fallback={v} />;
  }
  if (field === 'buildingTypeCodes' && Array.isArray(v) && v.length > 0) {
    // ParameterDisplay auto-handles comma-separated codes → "Desc1, Desc2"
    return <ParameterDisplay group="BuildingType" code={v.join(',')} fallback={v.join(', ')} />;
  }
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

// Removable chip ids: attribute fields plus the special centre + period chips.
type RemovableField = ChipField | 'center' | 'period';

interface ActiveFilterChipsProps {
  query: HistorySearchFormValues;
  onRemove: (field: RemovableField) => void;
  onClearAll: () => void;
}

export function ActiveFilterChips({ query, onRemove, onClearAll }: ActiveFilterChipsProps) {
  const { t } = useTranslation('historySearch');

  // Build one descriptor per active criterion — the chip bar reflects the WHOLE search.
  const chips: { id: RemovableField; label: string; value: ReactNode }[] = [];

  // Centre (+ radius) — only meaningful when a centre point is set.
  if (query.centerLat && query.centerLon) {
    chips.push({
      id: 'center',
      label: t('searchPanel.center'),
      value: `${query.centerLat}, ${query.centerLon} · ${query.radiusKm || '1'} km`,
    });
  }

  // Period — always set (defaults to Past 3 Years).
  if (query.period) {
    chips.push({
      id: 'period',
      label: t('searchPanel.period'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: t(`searchPanel.periodOptions.${query.period}` as any) as string,
    });
  }

  // Attribute filters.
  for (const f of CHIP_FIELDS) {
    if (isFieldActive(f, query)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chips.push({ id: f, label: t(FIELD_I18N[f] as any) as string, value: fieldDisplayValue(f, query) });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-1.5 px-3 py-1.5 border-b border-gray-100 bg-gray-50">
      {chips.map(chip => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium px-2 py-0.5"
        >
          <span className="text-blue-400">{chip.label}:</span>
          <span className="truncate max-w-[140px]">{chip.value}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.id)}
            className="ml-0.5 text-blue-400 hover:text-blue-700 transition-colors"
            aria-label={`Remove ${chip.label}`}
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-[11px] text-gray-400 hover:text-gray-600 underline transition-colors ml-0.5"
      >
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          t('resultsList.activeFilters.clearAll' as any)
        }
      </button>
    </div>
  );
}

// Re-export chip types so the orchestrator can use them
export type { ChipField, RemovableField };
