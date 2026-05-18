import { useMemo } from 'react';
import { useCompanyStore } from '@/shared/store';
import { useGetCompanyByIdMinimal } from '@/shared/api/companies';
import Autocomplete from '@/shared/components/inputs/Autocomplete';

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

  // Fallback: if the store hasn't loaded yet and we have an external value,
  // hydrate the display name from the API so the input shows a name.
  const { data: hydratedCompany } = useGetCompanyByIdMinimal(!isLoaded && value ? value : null);

  const items = useMemo(
    () => companies.map(c => ({ value: c.id, label: c.companyName })),
    [companies],
  );

  const displayText = useMemo(() => {
    if (!value) return undefined;
    const fromStore = companies.find(c => c.id === value)?.companyName;
    return fromStore ?? hydratedCompany?.companyName;
  }, [value, companies, hydratedCompany]);

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
