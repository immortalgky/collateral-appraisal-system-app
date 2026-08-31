import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { useGetCompanyById } from '../../api/administration';
import { useAddressStore, useCompanyStore } from '@/shared/store';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';

interface ActiveFilterChipsProps {
  filters: Record<string, string>;
  onRemove: (key: string) => void;
  onClearAll: () => void;
  /**
   * Display label per filter key, from the same list that builds the filter bar. Passed in so a
   * chip and the control it mirrors always read the same, in the user's language.
   */
  labels?: Record<string, string>;
  /**
   * Option lists for the enum filters, keyed by filter key — the same lists the dropdowns use.
   * Without them a status chip printed the wire value ("InProgress") next to a dropdown showing
   * "In Progress", in whatever language the rest of the page was in.
   */
  valueOptions?: Record<string, { value: string; label: string }[]>;
}

/**
 * Last-resort label: split a camelCase key into words. Produces English regardless of locale
 * ("assigneeCompanyId" → "Assignee Company Id"), so it is only reached for a key the filter list
 * does not describe — which today is none of them.
 */
const formatLabel = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();

/** Filter keys whose value is a master-data code, so the chip shows the description instead. */
const PARAMETER_CHIP_GROUPS: Record<string, string> = {
  bankingSegment: 'BankingSegment',
  purpose: 'AppraisalPurpose',
  propertyType: 'PropertyType',
};

interface CompanyChipProps {
  label: string;
  companyId: string;
  onRemove: () => void;
}

function CompanyChip({ label, companyId, onRemove }: CompanyChipProps) {
  const companies = useCompanyStore(s => s.companies);
  const isLoaded = useCompanyStore(s => s.isLoaded);
  const localizeCompanyName = useLocalizedCompanyName();

  // Prefer store lookup; fall back to API only if store hasn't loaded
  const { data: apiCompany } = useGetCompanyById(!isLoaded ? companyId : null);

  const displayValue = useMemo(() => {
    const fromStore = companies.find(c => c.id === companyId);
    if (fromStore) return localizeCompanyName(fromStore.companyName, fromStore.companyNameLocal);
    if (apiCompany) return localizeCompanyName(apiCompany.companyName, apiCompany.companyNameLocal);
    return companyId;
  }, [companies, companyId, apiCompany, localizeCompanyName]);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
      <span className="font-medium">{label}:</span> {displayValue}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="hover:text-primary/70 ml-0.5"
      >
        <Icon style="solid" name="xmark" className="size-3" />
      </button>
    </span>
  );
}

interface ProvinceChipProps {
  label: string;
  provinceCode: string;
  onRemove: () => void;
}

function ProvinceChip({ label, provinceCode, onRemove }: ProvinceChipProps) {
  const titleAddresses = useAddressStore(s => s.titleAddresses);
  const dopaAddresses = useAddressStore(s => s.dopaAddresses);

  const provinceName = useMemo(() => {
    const all = [...titleAddresses, ...dopaAddresses];
    return all.find(a => a.provinceCode === provinceCode)?.provinceName ?? provinceCode;
  }, [titleAddresses, dopaAddresses, provinceCode]);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
      <span className="font-medium">{label}:</span> {provinceName}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="hover:text-primary/70 ml-0.5"
      >
        <Icon style="solid" name="xmark" className="size-3" />
      </button>
    </span>
  );
}

interface ParameterChipProps {
  label: string;
  group: string;
  code: string;
  onRemove: () => void;
}

function ParameterChip({ label, group, code, onRemove }: ParameterChipProps) {
  // Falls back to the raw code when the parameter store hasn't hydrated or the code is unknown
  const description = useParameterDescription(group, code);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
      <span className="font-medium">{label}:</span> {description}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="hover:text-primary/70 ml-0.5"
      >
        <Icon style="solid" name="xmark" className="size-3" />
      </button>
    </span>
  );
}

function ActiveFilterChips({
  filters,
  onRemove,
  onClearAll,
  labels,
  valueOptions,
}: ActiveFilterChipsProps) {
  const { t } = useTranslation('appraisal');
  const active = Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined);
  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500">{t('list.activeFilters')}</span>
      {active.map(([key, value]) => {
        const label = labels?.[key] ?? formatLabel(key);
        // A quick view can set several values at once ("AtRisk,Breached"), so resolve each.
        const displayValue = valueOptions?.[key]
          ? value
              .split(',')
              .map(v => valueOptions[key].find(o => o.value === v)?.label ?? v)
              .join(', ')
          : value;

        if (key === 'assigneeCompanyId') {
          return (
            <CompanyChip key={key} label={label} companyId={value} onRemove={() => onRemove(key)} />
          );
        }

        if (key === 'province') {
          return (
            <ProvinceChip
              key={key}
              label={label}
              provinceCode={value}
              onRemove={() => onRemove(key)}
            />
          );
        }

        const parameterGroup = PARAMETER_CHIP_GROUPS[key];
        if (parameterGroup) {
          return (
            <ParameterChip
              key={key}
              label={label}
              group={parameterGroup}
              code={value}
              onRemove={() => onRemove(key)}
            />
          );
        }

        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
          >
            <span className="font-medium">{label}:</span> {displayValue}
            <button
              onClick={() => onRemove(key)}
              aria-label={t('list.removeFilter') + ': ' + label}
              className="hover:text-primary/70 ml-0.5"
            >
              <Icon style="solid" name="xmark" className="size-3" />
            </button>
          </span>
        );
      })}
      <button onClick={onClearAll} className="text-xs text-gray-500 hover:text-gray-700 underline">
        {t('list.clearAll')}
      </button>
    </div>
  );
}

export default ActiveFilterChips;
