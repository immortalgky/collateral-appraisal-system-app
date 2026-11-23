import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format as dateFnsFormat, parseISO } from 'date-fns';
import Input from '@shared/components/Input';
import MultiSelectDropdown from '@shared/components/inputs/MultiSelectDropdown';
import { DateRangeInput } from '@shared/components/inputs';
import UserAutocomplete from '@shared/components/inputs/UserAutocomplete';
import DepartmentAutocomplete from '@shared/components/inputs/DepartmentAutocomplete';
import AoCodeAutocomplete from '@shared/components/inputs/AoCodeAutocomplete';
import type { ListBoxItem } from '@shared/components/inputs/Dropdown';
import { APPRAISAL_STATUS_FILTER_OPTIONS } from '@shared/constants/appraisalStatus';
import { EVALUATION_STATUS_FILTER_OPTIONS } from '@shared/constants/evaluationStatus';
import { FEE_STATUS_FILTER_OPTIONS } from '@shared/constants/feeStatus';
import { useParameterOptions } from '@shared/utils/parameterUtils';
import CompanyAutocomplete from '@shared/components/inputs/CompanyAutocomplete';
import { useLocalizedCompanyName } from '@shared/utils/companyName';
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
  bankingSegment: 'Banking Segment',
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

const FILTER_LABELS_TH: Partial<Record<FilterField, string>> = {
  appraisalNumber: 'หมายเลขเล่มประเมิน',
  createdFrom: 'วันที่สร้างตั้งแต่',
  createdTo: 'วันที่สร้างถึง',
  approvedFrom: 'วันที่อนุมัติ ตั้งแต่',
  approvedTo: 'วันที่อนุมัติ ถึง',
  status: 'สถานะ',
  bankingSegment: 'กลุ่มลูกค้า',
  appraisalCompany: 'บริษัทประเมิน',
  internalStaff: 'ผู้ประเมินภายใน',
  channel: 'ช่องทาง',
  customerName: 'ชื่อลูกค้า',
  evaluationStatus: 'สถานะการให้คะแนน',
  payType: 'ประเภทการชำระเงิน',
  feeStatus: 'สถานะค่าธรรมเนียม',
  assignType: 'ประเภทการมอบหมาย',
  purpose: 'วัตถุประสงค์',
  externalStaff: 'ผู้ประเมินภายนอก',
  departmentCode: 'แผนก',
  aoCode: 'รหัส AO',
  appraisalType: 'ประเภทการประเมิน',
  feeType: 'ประเภทการชำระค่าธรรมเนียม',
  // reviewType / stage stay English: the meaning of the AS400 codes is not clear enough to translate.
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

const DATE_FIELDS = new Set<FilterField>([
  'createdFrom',
  'createdTo',
  'approvedFrom',
  'approvedTo',
]);

// From/To bounds that render as one chip and stay ordered (From <= To).
const DATE_PAIRS: Partial<Record<FilterField, FilterField>> = {
  createdFrom: 'createdTo',
  approvedFrom: 'approvedTo',
};
const DATE_PAIR_FROM: Partial<Record<FilterField, FilterField>> = Object.fromEntries(
  Object.entries(DATE_PAIRS).map(([from, to]) => [to, from]),
);

// Everything else (appraisalNumber, customerName, internalStaff, stage) is an
// open-ended search where the possible values aren't a known list — kept as a text input.

const csvToArray = (v: string | undefined): string[] => (v ? v.split(',').filter(Boolean) : []);

interface ReportFilterBarProps {
  filters: FilterField[];
  values: BaseReportFilter;
  onChange: (patch: Partial<BaseReportFilter>) => void;
  onReset: () => void;
}

/**
 * Inline filter bar + active-filter chips (monitoring list-page idiom). Fixed-value fields use the
 * shared MultiSelectDropdown (multi-select); open-ended fields use a text Input; dates use the
 * shared DateRangeInput. Multi-select values are stored as a comma-separated string — the backend filter
 * helpers split it into an IN clause.
 */
function ReportFilterBar({ filters, values, onChange, onReset }: ReportFilterBarProps) {
  const isTh = useTranslation().i18n.language?.startsWith('th');
  const labelOf = (field: FilterField) => (isTh && FILTER_LABELS_TH[field]) || FILTER_LABELS[field];
  // A From/To pair shares one label: "Approved Date From" / "วันที่อนุมัติ ตั้งแต่" -> the range name.
  const rangeLabelOf = (from: FilterField) =>
    labelOf(from)
      .replace(/ From$|ตั้งแต่$/, '')
      .trim();
  const allOf = (label: string) => (isTh ? 'ทั้งหมด' : `All ${label}`);
  const searchOf = (label: string) => (isTh ? `ค้นหา${label}` : `Search ${label}`);
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
  // Match against both the English and Thai names — company-name display sites are locale-aware,
  // so a value typed/pasted from one of them may be either.
  const companies = useCompanyStore(s => s.companies);
  const selectedCompany = useMemo(
    () =>
      companies.find(
        c =>
          c.companyName === values.appraisalCompany ||
          c.companyNameLocal === values.appraisalCompany,
      ),
    [companies, values.appraisalCompany],
  );
  const selectedCompanyId = selectedCompany?.id;
  const localizeCompanyName = useLocalizedCompanyName();

  const optionsFor = (field: FilterField): ListBoxItem[] =>
    MULTI_OPTION_FIELDS[field] ?? paramOptionsFor(field);

  const displayValue = (field: FilterField, raw: string): string => {
    if (field in MULTI_OPTION_FIELDS || field in PARAMETER_MULTI_FIELDS) {
      const opts = optionsFor(field);
      return csvToArray(raw)
        .map(v => opts.find(o => o.value === v)?.label ?? v)
        .join(', ');
    }
    if (field === 'appraisalCompany' && selectedCompany) {
      return localizeCompanyName(selectedCompany.companyName, selectedCompany.companyNameLocal);
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

  const valueOf = (field: FilterField) => (values as Record<string, string | undefined>)[field];

  const chips: ActiveFilterChip[] = filters
    .filter(
      field => Boolean(valueOf(field)) || Boolean(DATE_PAIRS[field] && valueOf(DATE_PAIRS[field]!)),
    )
    .filter(field => !DATE_PAIR_FROM[field])
    .map(field => {
      const to = DATE_PAIRS[field];
      if (!to) {
        return {
          key: field,
          label: `${labelOf(field)}: ${displayValue(field, String(valueOf(field)))}`,
          onClear: () => onChange({ [field]: undefined }),
        };
      }
      // One chip per date range: "Approved Date: 23/11/2026 – 24/11/2026", or "from …" / "to …".
      const fromText = valueOf(field) && displayValue(field, valueOf(field)!);
      const toText = valueOf(to) && displayValue(to, valueOf(to)!);
      const range =
        fromText && toText
          ? `${fromText} – ${toText}`
          : fromText
            ? `${isTh ? 'ตั้งแต่' : 'from'} ${fromText}`
            : `${isTh ? 'ถึง' : 'to'} ${toText}`;
      const name = labelOf(field)
        .replace(/ From$|ตั้งแต่$/, '')
        .trim();
      return {
        key: field,
        label: `${name}: ${range}`,
        onClear: () => onChange({ [field]: undefined, [to]: undefined }),
      };
    });

  if (filters.length === 0) return null;

  return (
    <div className="shrink-0 flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2.5">
        {filters.map(field => {
          // The To key of a pair is rendered by its From key's range control.
          if (DATE_PAIR_FROM[field]) return null;
          const val = ((values as Record<string, unknown>)[field] as string) ?? '';
          const to = DATE_PAIRS[field];
          const label = to ? rangeLabelOf(field) : labelOf(field);
          const isMultiOption = field in MULTI_OPTION_FIELDS;
          const isParamMulti = field in PARAMETER_MULTI_FIELDS;

          return (
            <div key={field} className={`flex flex-col gap-1 max-w-full ${to ? 'w-64' : 'w-56'}`}>
              <label className="text-xs font-medium text-(--palette-gray-600)">{label}</label>
              {isMultiOption || isParamMulti ? (
                // MultiSelectDropdown sizes to its content (w-fit); stretch its root and button
                // from here rather than restyling the shared component.
                <div className="[&>div]:w-full [&>div>button]:w-full">
                  <MultiSelectDropdown
                    options={optionsFor(field)}
                    value={csvToArray(val)}
                    onChange={arr => onChange({ [field]: arr.length ? arr.join(',') : undefined })}
                    placeholder={allOf(label)}
                    showValuePrefix={false}
                  />
                </div>
              ) : to ? (
                <DateRangeInput
                  from={val}
                  to={((values as Record<string, unknown>)[to] as string) ?? ''}
                  onChange={(from, toVal) =>
                    onChange({ [field]: from || undefined, [to]: toVal || undefined })
                  }
                  placeholder={label}
                />
              ) : field in USER_SCOPE_FIELDS ? (
                <UserAutocomplete
                  value={val}
                  onChange={v => onChange({ [field]: v || undefined })}
                  scope={USER_SCOPE_FIELDS[field]!}
                  companyId={field === 'externalStaff' ? selectedCompanyId : undefined}
                  placeholder={searchOf(label)}
                />
              ) : field === 'appraisalCompany' ? (
                // The control binds a Guid; the filter value (and the BE param) stays the English name.
                <CompanyAutocomplete
                  value={selectedCompanyId ?? ''}
                  onChange={id =>
                    onChange({ appraisalCompany: companies.find(c => c.id === id)?.companyName })
                  }
                  placeholder={searchOf(label)}
                />
              ) : field === 'departmentCode' ? (
                <DepartmentAutocomplete
                  value={val}
                  onChange={v => onChange({ [field]: v || undefined })}
                  placeholder={searchOf(label)}
                />
              ) : field === 'aoCode' ? (
                <AoCodeAutocomplete
                  value={val}
                  onChange={v => onChange({ [field]: v || undefined })}
                  placeholder={searchOf(label)}
                />
              ) : (
                <Input
                  value={val}
                  onChange={e => onChange({ [field]: e.target.value || undefined })}
                  placeholder={searchOf(label)}
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
