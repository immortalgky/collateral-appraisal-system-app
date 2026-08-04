import { useMemo } from 'react';
import { useCompanyStore } from '@/shared/store';
import { useGetCompanyByIdMinimal } from '@/shared/api/companies';
import Autocomplete from '@/shared/components/inputs/Autocomplete';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';

interface CompanyAutocompleteProps {
  /** Company Guid. Submitted value sent to backend. */
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

function CompanyAutocomplete({
  value,
  onChange,
  placeholder = 'Search company...',
}: CompanyAutocompleteProps) {
  const companies = useCompanyStore(s => s.companies);
  const isLoaded = useCompanyStore(s => s.isLoaded);
  const localizeCompanyName = useLocalizedCompanyName();

  // Fallback: if the store hasn't loaded yet and we have an external value,
  // hydrate the display name from the API so the input shows a name.
  const { data: hydratedCompany } = useGetCompanyByIdMinimal(!isLoaded && value ? value : null);

  const items = useMemo(
    () =>
      companies
        .map(c => ({ value: c.id, label: localizeCompanyName(c.companyName, c.companyNameLocal) }))
        // Backend orders by English Name, which reads arbitrary once labels are localized.
        .sort((a, b) => a.label.localeCompare(b.label)),
    [companies, localizeCompanyName],
  );

  const displayText = useMemo(() => {
    if (!value) return undefined;
    const fromStore = companies.find(c => c.id === value);
    if (fromStore) return localizeCompanyName(fromStore.companyName, fromStore.companyNameLocal);
    return hydratedCompany
      ? localizeCompanyName(hydratedCompany.companyName, hydratedCompany.companyNameLocal)
      : undefined;
  }, [value, companies, hydratedCompany, localizeCompanyName]);

  return (
    <Autocomplete
      items={items}
      value={value}
      onChange={onChange}
      displayText={displayText}
      placeholder={placeholder}
      ariaLabel={placeholder}
      showAllOnFocus
      filterItems={(item, text) => item.label.toLowerCase().includes(text.toLowerCase())}
    />
  );
}

export default CompanyAutocomplete;
