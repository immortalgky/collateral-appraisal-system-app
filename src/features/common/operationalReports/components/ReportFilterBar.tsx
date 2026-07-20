import { useMemo } from 'react';
import { format as dateFnsFormat, parseISO } from 'date-fns';
import Input from '@shared/components/Input';
import MultiSelectDropdown from '@shared/components/inputs/MultiSelectDropdown';
import DatePickerInput from '@shared/components/inputs/DatePickerInput';
import UserAutocomplete from '@shared/components/inputs/UserAutocomplete';
import DepartmentAutocomplete from '@shared/components/inputs/DepartmentAutocomplete';
import AoCodeAutocomplete from '@shared/components/inputs/AoCodeAutocomplete';
import type { ListBoxItem } from '@shared/components/inputs/Dropdown';
import { APPRAISAL_STATUS_FILTER_OPTIONS } from '@shared/constants/appraisalStatus';
import { EVALUATION_STATUS_FILTER_OPTIONS } from '@shared/constants/evaluationStatus';
import { FEE_STATUS_FILTER_OPTIONS } from '@shared/constants/feeStatus';
import { useParameterOptions } from '@shared/utils/parameterUtils';
import { useCompanyStore } from '@/shared/store';
import type { BaseReportFilter } from '../api/operationalReportsApi';
import type { FilterField } from '../config/reports';
import ActiveFilterChips, { type ActiveFilterChip } from './ActiveFilterChips';

export const FILTER_LABELS: Record<FilterField, string> = {
  appraisalNumber: 'Appraisal No.',
  createdFrom: 'Create Date From',
  createdTo: 'Create Date To',
  approvedFrom: 'Approved Date From',
  approvedTo: 'Approved Date To',
  status: 'Status',
  bankingSegment: 'Retail/IBG',
  appraisalCompany: 'Company',
  internalStaff: 'Internal Staff',
  channel: 'Channel',
  reviewType: 'Review Type',
  stage: 'Stage',
  customerName: 'Customer',
  evaluationStatus: 'Eval. Status',
  payType: 'Pay Type',
  feeStatus: 'Fee Status',
  assignType: 'Assign Type',
  purpose: 'Purpose',
  externalStaff: 'External Appraisal Staff',
  departmentCode: 'Department',
  aoCode: 'AO Code',
  appraisalType: 'Appraisal Type',
  feeType: 'Fee Payment Type',
};

/** Username fields — bind a usercode, so they use the user autocomplete rather than free text. */
const USER_SCOPE_FIELDS: Partial<Record<FilterField, 'Bank' | 'Company'>> = {
  internalStaff: 'Bank',
  externalStaff: 'Company',
};

// Small fixed value sets (multi-select). Parameter-sourced fields (channel, payType) are resolved
// from the parameter service at render time; open-ended fields fall through to a text input.
const BANKING_SEGMENT_OPTIONS: ListBoxItem[] = [
  { value: 'RETAIL', label: 'Retail' },
  { value: 'IBG', label: 'IBG' },
];
const ASSIGN_TYPE_OPTIONS: ListBoxItem[] = [
  { value: 'Internal', label: 'Internal' },
  { value: 'External', label: 'External' },
];
// RCAS008 appraisal type — matches the backend's AppraisalTypes.ValidValues, stored verbatim in
// the DB, so labels intentionally mirror the raw value (no re-wording).
const APPRAISAL_TYPE_OPTIONS: ListBoxItem[] = [
  { value: 'New', label: 'New' },
  { value: 'ReAppraisal', label: 'Re-Appraisal' },
  { value: 'Progressive', label: 'Progressive' },
  { value: 'PreAppraisal', label: 'Pre-Appraisal' },
];
// RCAS002 review type — the raw AS400 code the filter binds (see vw_RCAS002 CASE mapping).
const REVIEW_TYPE_OPTIONS: ListBoxItem[] = [
  { value: '1', label: 'Normal' },
  { value: '2', label: 'Before Stage 3' },
  { value: '3', label: 'Stage 3' },
];

/** Fields rendered as a multi-select of a FIXED option list (value set is known). */
const MULTI_OPTION_FIELDS: Partial<Record<FilterField, ListBoxItem[]>> = {
  status: APPRAISAL_STATUS_FILTER_OPTIONS,
  evaluationStatus: EVALUATION_STATUS_FILTER_OPTIONS,
  feeStatus: FEE_STATUS_FILTER_OPTIONS,
  bankingSegment: BANKING_SEGMENT_OPTIONS,
  assignType: ASSIGN_TYPE_OPTIONS,
  reviewType: REVIEW_TYPE_OPTIONS,
  appraisalType: APPRAISAL_TYPE_OPTIONS,
};

/** Fields rendered as a multi-select sourced from a parameter group. */
const PARAMETER_MULTI_FIELDS: Partial<Record<FilterField, string>> = {
  channel: 'Channel',
  payType: 'FeePaymentMethod',
  purpose: 'AppraisalPurpose',
  feeType: 'FeePaymentMethod',
};

const DATE_FIELDS = new Set<FilterField>(['createdFrom', 'createdTo', 'approvedFrom', 'approvedTo']);

// Everything else (appraisalNumber, customerName, appraisalCompany, internalStaff, stage) is an
// open-ended search where the possible values aren't a known list — kept as a text input.

const csvToArray = (v: string | undefined): string[] =>
  v ? v.split(',').filter(Boolean) : [];

// DatePickerInput emits a full ISO timestamp with offset (e.g. 2026-07-19T00:00:00+07:00).
// Report date filters are calendar-date bounds, so trim to yyyy-MM-dd before it reaches the
// query params — otherwise the offset shifts the bound by a day server-side.
const toDateOnly = (v: string | null): string | undefined => (v ? v.slice(0, 10) : undefined);

interface ReportFilterBarProps {
  filters: FilterField[];
  values: BaseReportFilter;
  onChange: (patch: Partial<BaseReportFilter>) => void;
  onReset: () => void;
}

/**
 * Inline filter bar + active-filter chips (monitoring list-page idiom). Fixed-value fields use the
 * shared MultiSelectDropdown (multi-select); open-ended fields use a text Input; dates use the
 * shared DatePickerInput. Multi-select values are stored as a comma-separated string — the backend filter
 * helpers split it into an IN clause.
 */
function ReportFilterBar({ filters, values, onChange, onReset }: ReportFilterBarProps) {
  const channelOptions = useParameterOptions(PARAMETER_MULTI_FIELDS.channel ?? 'Channel');
  const payTypeOptions = useParameterOptions(PARAMETER_MULTI_FIELDS.payType ?? 'FeePaymentMethod');
  const purposeOptions = useParameterOptions(PARAMETER_MULTI_FIELDS.purpose ?? 'AppraisalPurpose');

  const paramOptionsFor = (field: FilterField): ListBoxItem[] =>
    field === 'channel'
      ? channelOptions
      : field === 'payType' || field === 'feeType'
        ? payTypeOptions
        : field === 'purpose'
          ? purposeOptions
          : [];

  // appraisalCompany binds a company NAME (backend LIKE match), not a Guid — resolve it to an
  // id here so externalStaff's UserAutocomplete can scope its search to the selected company.
  const companies = useCompanyStore(s => s.companies);
  const selectedCompanyId = useMemo(
    () => companies.find(c => c.companyName === values.appraisalCompany)?.id,
    [companies, values.appraisalCompany],
  );

  const optionsFor = (field: FilterField): ListBoxItem[] =>
    MULTI_OPTION_FIELDS[field] ?? paramOptionsFor(field);

  const displayValue = (field: FilterField, raw: string): string => {
    if (field in MULTI_OPTION_FIELDS || field in PARAMETER_MULTI_FIELDS) {
      const opts = optionsFor(field);
      return csvToArray(raw)
        .map(v => opts.find(o => o.value === v)?.label ?? v)
        .join(', ');
    }
    if (DATE_FIELDS.has(field)) {
      try {
        return dateFnsFormat(parseISO(raw), 'dd/MM/yyyy');
      } catch {
        return raw;
      }
    }
    return raw;
  };

  const chips: ActiveFilterChip[] = filters
    .filter(field => Boolean((values as Record<string, unknown>)[field]))
    .map(field => ({
      key: field,
      label: `${FILTER_LABELS[field]}: ${displayValue(field, String((values as Record<string, unknown>)[field]))}`,
      onClear: () => onChange({ [field]: undefined }),
    }));

  if (filters.length === 0) return null;

  return (
    <div className="shrink-0 flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2.5">
        {filters.map(field => {
          const val = ((values as Record<string, unknown>)[field] as string) ?? '';
          const label = FILTER_LABELS[field];
          const isMultiOption = field in MULTI_OPTION_FIELDS;
          const isParamMulti = field in PARAMETER_MULTI_FIELDS;

          return (
            <div key={field} className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-600">{label}</label>
              {isMultiOption || isParamMulti ? (
                <MultiSelectDropdown
                  options={optionsFor(field)}
                  value={csvToArray(val)}
                  onChange={arr => onChange({ [field]: arr.length ? arr.join(',') : undefined })}
                  placeholder={`All ${label}`}
                  showValuePrefix={false}
                />
              ) : DATE_FIELDS.has(field) ? (
                <DatePickerInput
                  value={val || null}
                  onChange={v => onChange({ [field]: toDateOnly(v) })}
                />
              ) : field in USER_SCOPE_FIELDS ? (
                <UserAutocomplete
                  value={val}
                  onChange={v => onChange({ [field]: v || undefined })}
                  scope={USER_SCOPE_FIELDS[field]!}
                  companyId={field === 'externalStaff' ? selectedCompanyId : undefined}
                  placeholder={`Search ${label}`}
                />
              ) : field === 'departmentCode' ? (
                <DepartmentAutocomplete
                  value={val}
                  onChange={v => onChange({ [field]: v || undefined })}
                  placeholder={`Search ${label}`}
                />
              ) : field === 'aoCode' ? (
                <AoCodeAutocomplete
                  value={val}
                  onChange={v => onChange({ [field]: v || undefined })}
                  placeholder={`Search ${label}`}
                />
              ) : (
                <Input
                  value={val}
                  onChange={e => onChange({ [field]: e.target.value || undefined })}
                  placeholder={`Search ${label}`}
                  fullWidth={false}
                  className="min-w-[160px]"
                />
              )}
            </div>
          );
        })}
      </div>

      <ActiveFilterChips chips={chips} onClearAll={onReset} />
    </div>
  );
}

export default ReportFilterBar;
