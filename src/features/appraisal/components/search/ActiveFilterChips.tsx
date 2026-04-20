import { useMemo } from 'react';
import Icon from '@/shared/components/Icon';
import { useGetCompanyById } from '../../api/administration';
import { useAddressStore, useCompanyStore } from '@/shared/store';

interface ActiveFilterChipsProps {
  filters: Record<string, string>;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

const formatLabel = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();

interface CompanyChipProps {
  label: string;
  companyId: string;
  onRemove: () => void;
}

function CompanyChip({ label, companyId, onRemove }: CompanyChipProps) {
  const companies = useCompanyStore(s => s.companies);
  const isLoaded = useCompanyStore(s => s.isLoaded);

  // Prefer store lookup; fall back to API only if store hasn't loaded
  const { data: apiCompany } = useGetCompanyById(!isLoaded ? companyId : null);

  const displayValue = useMemo(() => {
    const fromStore = companies.find(c => c.id === companyId)?.companyName;
    return fromStore ?? apiCompany?.companyName ?? companyId;
  }, [companies, companyId, apiCompany]);

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

function ActiveFilterChips({ filters, onRemove, onClearAll }: ActiveFilterChipsProps) {
  const active = Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined);
  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500">Filters:</span>
      {active.map(([key, value]) => {
        const label = formatLabel(key);

        if (key === 'assigneeCompanyId') {
          return (
            <CompanyChip
              key={key}
              label={label}
              companyId={value}
              onRemove={() => onRemove(key)}
            />
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

        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
          >
            <span className="font-medium">{label}:</span> {value}
            <button
              onClick={() => onRemove(key)}
              aria-label={`Remove ${label} filter`}
              className="hover:text-primary/70 ml-0.5"
            >
              <Icon style="solid" name="xmark" className="size-3" />
            </button>
          </span>
        );
      })}
      <button onClick={onClearAll} className="text-xs text-gray-500 hover:text-gray-700 underline">
        Clear all
      </button>
    </div>
  );
}

export default ActiveFilterChips;
