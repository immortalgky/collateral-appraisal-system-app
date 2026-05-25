import { useTranslation } from 'react-i18next';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { useEffect } from 'react';
import type { HistorySearchFormValues, HistorySearchPeriod } from '../types';
import MultiSelectDropdown from '@shared/components/inputs/MultiSelectDropdown';

interface SearchPanelProps {
  defaultValues?: Partial<HistorySearchFormValues>;
  onSearch: (values: HistorySearchFormValues) => void;
  /** When true, fire search immediately on mount with defaultValues */
  autoSearch?: boolean;
  isPending?: boolean;
}

const PERIOD_OPTIONS: { value: HistorySearchPeriod; labelKey: string }[] = [
  { value: 'Past3y', labelKey: 'Past3y' },
  { value: 'Past2y', labelKey: 'Past2y' },
  { value: 'Past1y', labelKey: 'Past1y' },
  { value: 'Current', labelKey: 'Current' },
];

// FSD §2.6.7 — soft defaults: Collateral Type = "LB", Period = "Past3y", Radius = 1 km.
const FORM_DEFAULTS: HistorySearchFormValues = {
  centerLat: '',
  centerLon: '',
  radiusKm: '1',
  period: 'Past3y',
  appraisalReportNo: '',
  titleDeedNo: '',
  collateralType: 'LB',
  customerName: '',
  landAreaFromSqWa: '',
  landAreaToSqWa: '',
  buildingTypeCodes: [],
  subDistrict: '',
  district: '',
  province: '',
  valueFrom: '',
  valueTo: '',
  dateFrom: '',
  dateTo: '',
};

// FSD §2.6.7 — Collateral Type dropdown options.
// Values are the backend collateral-type codes (renamed in migration AddEngagementSearchFields):
// L=bare land, LB=land+building, U=condo, LSL=bare leasehold, MAC=machinery.
const COLLATERAL_TYPE_OPTIONS = [
  { value: '', labelKey: 'all' },
  { value: 'L', labelKey: 'land' },
  { value: 'LB', labelKey: 'landAndBuilding' },
  { value: 'U', labelKey: 'condo' },
  { value: 'LSL', labelKey: 'leasehold' },
  { value: 'MAC', labelKey: 'machine' },
] as const;

// Shared label/input classnames to keep fields consistent
const LABEL_CLS = 'block text-xs font-medium text-gray-700 mb-1';
const INPUT_CLS =
  'w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';
const INPUT_DISABLED_CLS =
  'w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed';

// Section heading style
const GROUP_HEADING_CLS =
  'text-[10px] font-semibold text-blue-700 uppercase tracking-wider border-b border-blue-100 pb-1 mb-3';

export function SearchPanel({ defaultValues, onSearch, autoSearch = false, isPending = false }: SearchPanelProps) {
  const { t } = useTranslation('historySearch');

  const { register, handleSubmit, reset, getValues, control } = useForm<HistorySearchFormValues>({
    defaultValues: { ...FORM_DEFAULTS, ...defaultValues },
  });

  // Embedded mode: fire search on mount once defaults are set
  useEffect(() => {
    if (autoSearch) {
      const id = setTimeout(() => {
        onSearch(getValues());
      }, 0);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearch]);

  // When parent updates defaultValues (e.g. map click sets lat/lon), re-apply
  useEffect(() => {
    if (defaultValues) {
      reset({ ...FORM_DEFAULTS, ...defaultValues });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  const onSubmit: SubmitHandler<HistorySearchFormValues> = values => {
    onSearch(values);
  };

  const handleClear = () => {
    reset(FORM_DEFAULTS);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col h-full overflow-y-auto bg-white"
      data-testid="search-panel"
    >
      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-0 items-start">

          {/* ══ LEFT COLUMN — Appraisal Request & Identification ══════════ */}
          <div className="flex flex-col gap-3">
            <p className={GROUP_HEADING_CLS}>{t('searchPanel.groupAppraisalId')}</p>

            {/* Appraisal Report No. */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.appraisalReportNo')}</label>
              <input type="text" className={INPUT_CLS} {...register('appraisalReportNo')} />
            </div>

            {/* Old Appraisal Report No. — coming soon, disabled */}
            <div>
              <label className={`${LABEL_CLS} flex items-center gap-1.5`}>
                {t('searchPanel.oldAppraisalReportNo')}
                <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                  {t('searchPanel.oldAppraisalReportNoComingSoon')}
                </span>
              </label>
              <input
                type="text"
                disabled
                className={INPUT_DISABLED_CLS}
                placeholder={t('searchPanel.oldAppraisalReportNoPlaceholder')}
                title={t('searchPanel.oldAppraisalReportNoComingSoon')}
              />
            </div>

            {/* Title Deed No. */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.titleDeedNo')}</label>
              <input type="text" className={INPUT_CLS} {...register('titleDeedNo')} />
            </div>

            {/* Collateral Type */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.collateralType')}</label>
              <select className={`${INPUT_CLS} bg-white`} {...register('collateralType')}>
                {COLLATERAL_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {t(`searchPanel.collateralTypeOptions.${opt.labelKey}` as any)}
                  </option>
                ))}
              </select>
            </div>

            {/* Building Type */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.buildingType')}</label>
              {/* Controller-wired since MultiSelectDropdown is uncontrolled.
                  The "BuildingType" parameter group is resolved from the global
                  parameter store; empty options while params are loading. */}
              <Controller
                name="buildingTypeCodes"
                control={control}
                render={({ field }) => (
                  <MultiSelectDropdown
                    group="BuildingType"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={t('searchPanel.buildingTypePlaceholder')}
                    showValuePrefix
                  />
                )}
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.customerName')}</label>
              <input type="text" className={INPUT_CLS} {...register('customerName')} />
            </div>

            {/* Appraisal Value Range (From / To) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL_CLS}>{t('searchPanel.valueFrom')}</label>
                <input type="number" min="0" className={INPUT_CLS} {...register('valueFrom')} />
              </div>
              <div>
                <label className={LABEL_CLS}>{t('searchPanel.valueTo')}</label>
                <input type="number" min="0" className={INPUT_CLS} {...register('valueTo')} />
              </div>
            </div>

            {/* Land Area Sq.Wa (From / To) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL_CLS}>{t('searchPanel.landAreaFromSqWa')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={INPUT_CLS}
                  {...register('landAreaFromSqWa')}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>{t('searchPanel.landAreaToSqWa')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={INPUT_CLS}
                  {...register('landAreaToSqWa')}
                />
              </div>
            </div>
          </div>

          {/* ══ RIGHT COLUMN — Date & Time + Location ═════════════════════ */}
          <div className="flex flex-col gap-3">
            {/* ── Appraisal Date & Time ──────────────────────────────────── */}
            <p className={GROUP_HEADING_CLS}>{t('searchPanel.groupAppraisalDate')}</p>

            {/* Appraisal Date From / To */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL_CLS}>{t('searchPanel.dateFrom')}</label>
                <input type="date" className={INPUT_CLS} {...register('dateFrom')} />
              </div>
              <div>
                <label className={LABEL_CLS}>{t('searchPanel.dateTo')}</label>
                <input type="date" className={INPUT_CLS} {...register('dateTo')} />
              </div>
            </div>

            {/* Appraisal Period */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.period')}</label>
              <select
                className={`${INPUT_CLS} bg-white`}
                {...register('period')}
              >
                {PERIOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {t(`searchPanel.periodOptions.${opt.labelKey}` as any)}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Location Information ───────────────────────────────────── */}
            <p className={`${GROUP_HEADING_CLS} mt-2`}>{t('searchPanel.groupLocation')}</p>

            {/* Latitude */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.centerLat')}</label>
              <input
                type="number"
                step="any"
                placeholder={t('searchPanel.centerLatPlaceholder')}
                className={INPUT_CLS}
                {...register('centerLat')}
              />
            </div>

            {/* Longitude */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.centerLon')}</label>
              <input
                type="number"
                step="any"
                placeholder={t('searchPanel.centerLonPlaceholder')}
                className={INPUT_CLS}
                {...register('centerLon')}
              />
            </div>

            {/* Radius from interest (km) */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.radiusKm')}</label>
              <input
                type="number"
                min="0.1"
                max="50"
                step="0.1"
                className={INPUT_CLS}
                {...register('radiusKm')}
              />
            </div>

            {/* Click-on-map hint */}
            <p className="text-[10px] text-gray-400 -mt-1">{t('searchPanel.clickMapHint')}</p>

            {/* Sub-district */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.subDistrict')}</label>
              <input type="text" className={INPUT_CLS} {...register('subDistrict')} />
            </div>

            {/* District */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.district')}</label>
              <input type="text" className={INPUT_CLS} {...register('district')} />
            </div>

            {/* Province */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.province')}</label>
              <input type="text" className={INPUT_CLS} {...register('province')} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer actions ───────────────────────────────────────────────── */}
      <div className="shrink-0 flex gap-2 px-4 py-3 border-t border-gray-100">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 border border-gray-300 rounded-md py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t('searchPanel.clear')}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-blue-600 text-white rounded-md py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
        >
          {isPending ? (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : null}
          {t('searchPanel.search')}
        </button>
      </div>
    </form>
  );
}
