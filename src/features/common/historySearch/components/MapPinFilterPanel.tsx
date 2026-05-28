import { useTranslation } from 'react-i18next';
import type { PinFilterState } from '../types';
import { buildPinIcon, type PinLayerKey } from '../icons';

interface MapPinFilterPanelProps {
  filters: PinFilterState;
  onFiltersChange: (filters: PinFilterState) => void;
  isExternal: boolean;
  /** When true, only MC layers are shown (collateral/appraisal layers are hidden). */
  mcOnly?: boolean;
}

/**
 * Five-row pin layer toggle panel. Each row pairs a checkbox with the 3D
 * cartoon house icon used on the map. The two "(existing)" layers are wired
 * to backend results today; the "(appraising)" and "Supporting Data" layers
 * are scaffolded — the toggle state is tracked but no data renders yet.
 *
 * Appraisal layers are hidden for external users (they only see their own
 * MarketComparable records). Defense-in-depth: parent also passes
 * `visibleAppraisalPins=[]` for externals.
 */
export function MapPinFilterPanel({ filters, onFiltersChange, isExternal, mcOnly = false }: MapPinFilterPanelProps) {
  const { t } = useTranslation('historySearch');

  const toggle = (key: keyof PinFilterState) => {
    onFiltersChange({ ...filters, [key]: !filters[key] });
  };

  // Layer definitions — declared as data so render and order stay in sync.
  // Comment beside each layer marks whether it's wired to backend results.
  // Layer order in the panel mirrors the FSD (existing → appraising → supporting).
  // Each row composites its icon via `buildPinIcon(layerKey)` so the legend
  // looks identical to the on-map marker.
  const LAYERS: Array<{
    key: keyof PinFilterState;
    layerKey: PinLayerKey;
    labelKey: string;
    testId: string;
    internalOnly?: boolean;
    /** When true, the row is rendered disabled (no backend yet). */
    comingSoon?: boolean;
  }> = [
    { key: 'showCollateral',           layerKey: 'collateralExisting',   labelKey: 'appraisalExisting',    testId: 'filter-collateral',            internalOnly: true },
    { key: 'showMarketComparables',    layerKey: 'mcExisting',           labelKey: 'mcExisting',           testId: 'filter-mc' },
    { key: 'showCollateralAppraising', layerKey: 'collateralAppraising', labelKey: 'collateralAppraising', testId: 'filter-collateral-appraising', internalOnly: true },
    { key: 'showMcAppraising',         layerKey: 'mcAppraising',         labelKey: 'mcAppraising',         testId: 'filter-mc-appraising' },
    { key: 'showSupportingData',       layerKey: 'supportingData',       labelKey: 'supportingData',       testId: 'filter-supporting-data',       comingSoon: true },
  ];

  return (
    <div className="flex flex-col gap-1 min-w-[15rem]">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider pb-2 mb-1 border-b border-gray-100">
        {t('pinFilter.title')}
      </p>

      {LAYERS.filter(layer => !(layer.internalOnly && isExternal) && !(mcOnly && layer.key !== 'showMarketComparables' && layer.key !== 'showMcAppraising')).map(layer => (
        <PinRow
          key={layer.key}
          checked={filters[layer.key]}
          onToggle={() => toggle(layer.key)}
          label={t(`pinFilter.${layer.labelKey}` as any)}
          iconUrl={buildPinIcon(layer.layerKey)}
          testId={layer.testId}
          disabled={layer.comingSoon}
          disabledTitle={layer.comingSoon ? t('pinFilter.comingSoon') : undefined}
        />
      ))}
    </div>
  );
}

// ─── Pin row ─────────────────────────────────────────────────────────────────

interface PinRowProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  iconUrl: string;
  testId: string;
  /** When true, checkbox is not interactable and the row shows a "coming soon" hint. */
  disabled?: boolean;
  disabledTitle?: string;
}

function PinRow({ checked, onToggle, label, iconUrl, testId, disabled = false, disabledTitle }: PinRowProps) {
  return (
    <label
      className={[
        'flex items-center gap-2.5 select-none px-1 py-1.5 rounded',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50',
      ].join(' ')}
      title={disabled ? disabledTitle : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={disabled ? undefined : onToggle}
        disabled={disabled}
        className="sr-only"
        data-testid={testId}
      />
      {/* Checkbox */}
      <span
        className={[
          'w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0',
          checked && !disabled ? 'bg-blue-600' : 'bg-white border border-gray-300',
        ].join(' ')}
        aria-hidden="true"
      >
        {checked && !disabled && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M1 5l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      {/* Map-pin SVG — 3:4 aspect to preserve the teardrop shape */}
      <img src={iconUrl} alt="" width={22} height={28} className="shrink-0" aria-hidden="true" />

      <span className="text-xs text-gray-700">{label}</span>
    </label>
  );
}
