import { useTranslation } from 'react-i18next';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import type { HistorySearchFormValues, HistorySearchPeriod } from '../types';
import MultiSelectDropdown from '@shared/components/inputs/MultiSelectDropdown';
import ProvinceAutocomplete from '@shared/components/inputs/ProvinceAutocomplete';
import Autocomplete from '@shared/components/inputs/Autocomplete';
import { useAddressStore } from '@/shared/store';
import TextInput from '@shared/components/inputs/TextInput';
import NumberInput from '@shared/components/inputs/NumberInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import type { ListBoxItem } from '@shared/components/inputs/Dropdown';
import DatePickerInput from '@shared/components/inputs/DatePickerInput';

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

// FSD §2.6.7 — soft defaults: Collateral Type = All (empty), Period = "Past3y", Radius = 1 km.
const FORM_DEFAULTS: HistorySearchFormValues = {
  centerLat: '',
  centerLon: '',
  radiusKm: '1',
  period: 'Past3y',
  appraisalReportNo: '',
  titleDeedNo: '',
  collateralType: '', // default "All" — collateral type is an optional filter
  customerName: '',
  landAreaFromSqWa: '',
  landAreaToSqWa: '',
  buildingTypeCodes: [],
  subDistrict: '',
  district: '',
  province: '',
  subDistrictName: '',
  districtName: '',
  provinceName: '',
  postcode: '',
  valueFrom: '',
  valueTo: '',
  dateFrom: '',
  dateTo: '',
};

// FSD §2.6.7 — Collateral Type dropdown options.
// Values are the backend collateral-type codes (renamed in migration AddEngagementSearchFields):
// L=bare land, LB=land+building, U=condo, LSL=bare leasehold, MAC=machinery.
// "All" is represented by the Dropdown's built-in placeholder row (value → empty
// string via the Controller bridge), so it is NOT listed as an explicit option here.
const COLLATERAL_TYPE_OPTIONS = [
  { value: 'L', labelKey: 'land' },
  { value: 'LB', labelKey: 'landAndBuilding' },
  { value: 'U', labelKey: 'condo' },
  { value: 'LSL', labelKey: 'leasehold' },
  { value: 'MAC', labelKey: 'machine' },
] as const;

// INPUT_DISABLED_CLS is still used by the coming-soon field
const INPUT_DISABLED_CLS =
  'w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed';

// Section heading style
const GROUP_HEADING_CLS =
  'text-[10px] font-semibold text-blue-700 uppercase tracking-wider border-b border-blue-100 pb-1 mb-3';

// Shared label style — still used for the coming-soon field label and the
// building-type / province / district / sub-district labels whose components
// don't accept a `label` prop.
const LABEL_CLS = 'block text-xs font-medium text-gray-700 mb-1';

export function SearchPanel({ defaultValues, onSearch, autoSearch = false, isPending = false }: SearchPanelProps) {
  const { t } = useTranslation('historySearch');

  const { handleSubmit, reset, getValues, control, watch, setValue } =
    useForm<HistorySearchFormValues>({
      defaultValues: { ...FORM_DEFAULTS, ...defaultValues },
    });

  // Title-address dataset powers the cascading province → district → sub-district selects.
  const titleAddresses = useAddressStore(s => s.titleAddresses);
  const selectedProvince = watch('province');
  const selectedDistrict = watch('district');

  const districtItems = useMemo(() => {
    if (!selectedProvince) return [];
    const seen = new Map<string, string>();
    for (const a of titleAddresses) {
      if (a.provinceCode === selectedProvince && !seen.has(a.districtCode)) {
        seen.set(a.districtCode, a.districtName);
      }
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, 'th'),
    );
  }, [titleAddresses, selectedProvince]);

  const subDistrictItems = useMemo(() => {
    if (!selectedDistrict) return [];
    const seen = new Map<string, string>();
    for (const a of titleAddresses) {
      if (a.districtCode === selectedDistrict && !seen.has(a.subDistrictCode)) {
        seen.set(a.subDistrictCode, a.subDistrictName);
      }
    }
    return Array.from(seen, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, 'th'),
    );
  }, [titleAddresses, selectedDistrict]);

  const handleProvinceChange = (code: string) => {
    setValue('province', code);
    setValue('provinceName', titleAddresses.find(a => a.provinceCode === code)?.provinceName ?? '');
    // Reset the more-specific levels
    setValue('district', '');
    setValue('districtName', '');
    setValue('subDistrict', '');
    setValue('subDistrictName', '');
  };

  const handleDistrictChange = (code: string) => {
    setValue('district', code);
    setValue('districtName', districtItems.find(d => d.value === code)?.label ?? '');
    setValue('subDistrict', '');
    setValue('subDistrictName', '');
  };

  const handleSubDistrictChange = (code: string) => {
    setValue('subDistrict', code);
    setValue('subDistrictName', subDistrictItems.find(s => s.value === code)?.label ?? '');
  };

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

  // Build typed option arrays for Dropdown (value must be string for field compatibility)
  const collateralTypeDropdownOptions = useMemo<ListBoxItem[]>(
    () =>
      COLLATERAL_TYPE_OPTIONS.map(opt => ({
        value: opt.value,
        label: t(`searchPanel.collateralTypeOptions.${opt.labelKey}` as any),
      })),
    [t],
  );

  const periodDropdownOptions = useMemo<ListBoxItem[]>(
    () =>
      PERIOD_OPTIONS.map(opt => ({
        value: opt.value,
        label: t(`searchPanel.periodOptions.${opt.labelKey}` as any),
      })),
    [t],
  );

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
            <Controller
              name="appraisalReportNo"
              control={control}
              render={({ field }) => (
                <TextInput
                  label={t('searchPanel.appraisalReportNo')}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

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
            <Controller
              name="titleDeedNo"
              control={control}
              render={({ field }) => (
                <TextInput
                  label={t('searchPanel.titleDeedNo')}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            {/* Collateral Type */}
            <Controller
              name="collateralType"
              control={control}
              render={({ field }) => (
                <Dropdown
                  label={t('searchPanel.collateralType')}
                  options={collateralTypeDropdownOptions}
                  // Empty string finds no option → placeholder ("All") shows.
                  value={field.value}
                  // Placeholder ("All") maps back to the empty-string filter value.
                  onChange={(v) => field.onChange(v ?? '')}
                  placeholder={t('searchPanel.collateralTypeOptions.all')}
                  showValuePrefix={false}
                />
              )}
            />

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
            <Controller
              name="customerName"
              control={control}
              render={({ field }) => (
                <TextInput
                  label={t('searchPanel.customerName')}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />

            {/* Appraisal Value Range (From / To) */}
            <div className="grid grid-cols-2 gap-2">
              <Controller
                name="valueFrom"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label={t('searchPanel.valueFrom')}
                    value={field.value === '' || field.value == null ? null : Number(field.value)}
                    onChange={e => field.onChange(e.target.value == null ? '' : String(e.target.value))}
                    onBlur={field.onBlur}
                    decimalPlaces={2}
                    thousandSeparator
                    allowNegative={false}
                  />
                )}
              />
              <Controller
                name="valueTo"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label={t('searchPanel.valueTo')}
                    value={field.value === '' || field.value == null ? null : Number(field.value)}
                    onChange={e => field.onChange(e.target.value == null ? '' : String(e.target.value))}
                    onBlur={field.onBlur}
                    decimalPlaces={2}
                    thousandSeparator
                    allowNegative={false}
                  />
                )}
              />
            </div>

            {/* Land Area Sq.Wa (From / To) */}
            <div className="grid grid-cols-2 gap-2">
              <Controller
                name="landAreaFromSqWa"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label={t('searchPanel.landAreaFromSqWa')}
                    value={field.value === '' || field.value == null ? null : Number(field.value)}
                    onChange={e => field.onChange(e.target.value == null ? '' : String(e.target.value))}
                    onBlur={field.onBlur}
                    decimalPlaces={2}
                    thousandSeparator
                    allowNegative={false}
                  />
                )}
              />
              <Controller
                name="landAreaToSqWa"
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label={t('searchPanel.landAreaToSqWa')}
                    value={field.value === '' || field.value == null ? null : Number(field.value)}
                    onChange={e => field.onChange(e.target.value == null ? '' : String(e.target.value))}
                    onBlur={field.onBlur}
                    decimalPlaces={2}
                    thousandSeparator
                    allowNegative={false}
                  />
                )}
              />
            </div>
          </div>

          {/* ══ RIGHT COLUMN — Date & Time + Location ═════════════════════ */}
          <div className="flex flex-col gap-3">
            {/* ── Appraisal Date & Time ──────────────────────────────────── */}
            <p className={GROUP_HEADING_CLS}>{t('searchPanel.groupAppraisalDate')}</p>

            {/* Appraisal Date From / To */}
            {/* DatePickerInput.onChange emits formatISO() which produces a full
                ISO datetime string (e.g. "2024-01-15T00:00:00+07:00").
                Slice to [0,10] to keep the wire format as YYYY-MM-DD. */}
            <div className="grid grid-cols-2 gap-2">
              <Controller
                name="dateFrom"
                control={control}
                render={({ field }) => (
                  <DatePickerInput
                    label={t('searchPanel.dateFrom')}
                    value={field.value || null}
                    onChange={v => field.onChange(v ? v.slice(0, 10) : '')}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <Controller
                name="dateTo"
                control={control}
                render={({ field }) => (
                  <DatePickerInput
                    label={t('searchPanel.dateTo')}
                    value={field.value || null}
                    onChange={v => field.onChange(v ? v.slice(0, 10) : '')}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>

            {/* Appraisal Period */}
            <Controller
              name="period"
              control={control}
              render={({ field }) => (
                <Dropdown
                  label={t('searchPanel.period')}
                  options={periodDropdownOptions}
                  value={field.value}
                  // Period is required — ignore the placeholder row (null) so the
                  // value can never be cleared to an invalid state.
                  onChange={(v) => field.onChange(v ?? field.value)}
                  placeholder=""
                  showValuePrefix={false}
                />
              )}
            />

            {/* ── Location Information ───────────────────────────────────── */}
            <p className={`${GROUP_HEADING_CLS} mt-2`}>{t('searchPanel.groupLocation')}</p>

            {/* Latitude — NumberInput accepts string values via its value prop (parses internally).
                Map clicks call reset() with string coords like "13.736717"; this works because
                NumberInput.value accepts number | string | null and parses strings. */}
            <Controller
              name="centerLat"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={t('searchPanel.centerLat')}
                  value={field.value === '' || field.value == null ? null : field.value}
                  onChange={e => field.onChange(e.target.value == null ? '' : String(e.target.value))}
                  onBlur={field.onBlur}
                  thousandSeparator={false}
                  allowNegative
                  decimalPlaces={6}
                  placeholder={t('searchPanel.centerLatPlaceholder')}
                />
              )}
            />

            {/* Longitude */}
            <Controller
              name="centerLon"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={t('searchPanel.centerLon')}
                  value={field.value === '' || field.value == null ? null : field.value}
                  onChange={e => field.onChange(e.target.value == null ? '' : String(e.target.value))}
                  onBlur={field.onBlur}
                  thousandSeparator={false}
                  allowNegative
                  decimalPlaces={6}
                  placeholder={t('searchPanel.centerLonPlaceholder')}
                />
              )}
            />

            {/* Radius from interest (km) — max 50 km */}
            <Controller
              name="radiusKm"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={t('searchPanel.radiusKm')}
                  value={field.value === '' || field.value == null ? null : Number(field.value)}
                  onChange={e => field.onChange(e.target.value == null ? '' : String(e.target.value))}
                  onBlur={field.onBlur}
                  thousandSeparator={false}
                  decimalPlaces={1}
                  allowNegative={false}
                  // No `min` here: NumberInput rejects per-keystroke values below min,
                  // which would block typing "0.5" (the leading "0" < 0.1). The floor is
                  // clamped on submit in HistorySearchMap instead. Cap stays at 50.
                  max={50}
                  suffix="km"
                />
              )}
            />

            {/* Click-on-map hint */}
            <p className="text-[10px] text-gray-400 -mt-1">{t('searchPanel.clickMapHint')}</p>

            {/* Province → District → Sub-district cascade. Each level is optional,
                so users can filter by province only, province+district, or all three. */}
            <div>
              <label className={LABEL_CLS}>{t('searchPanel.province')}</label>
              <ProvinceAutocomplete
                value={selectedProvince}
                onChange={handleProvinceChange}
                placeholder={t('searchPanel.provincePlaceholder')}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>{t('searchPanel.district')}</label>
              <Autocomplete
                items={districtItems}
                value={selectedDistrict}
                onChange={handleDistrictChange}
                displayText={districtItems.find(d => d.value === selectedDistrict)?.label}
                placeholder={t('searchPanel.districtPlaceholder')}
                ariaLabel={t('searchPanel.district')}
                showAllOnFocus
                filterItems={(item, text) =>
                  item.label.toLocaleLowerCase('th').includes(text.toLocaleLowerCase('th'))
                }
              />
            </div>

            <div>
              <label className={LABEL_CLS}>{t('searchPanel.subDistrict')}</label>
              <Autocomplete
                items={subDistrictItems}
                value={watch('subDistrict')}
                onChange={handleSubDistrictChange}
                displayText={subDistrictItems.find(s => s.value === watch('subDistrict'))?.label}
                placeholder={t('searchPanel.subDistrictPlaceholder')}
                ariaLabel={t('searchPanel.subDistrict')}
                showAllOnFocus
                filterItems={(item, text) =>
                  item.label.toLocaleLowerCase('th').includes(text.toLocaleLowerCase('th'))
                }
              />
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
