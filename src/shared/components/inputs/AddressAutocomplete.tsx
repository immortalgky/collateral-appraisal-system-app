import { useState, useMemo } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import clsx from 'clsx';
import Icon from '../Icon';
import { useAddressStore } from '@/shared/store';
import type { ThaiAddress } from '@/shared/data/thaiAddresses';
import { useFormReadOnly } from '../form/context';

interface AddressAutocompleteProps {
  value: ThaiAddress | null;
  onChange: (address: ThaiAddress | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

const AddressAutocomplete = ({
  value,
  onChange,
  label,
  placeholder = 'พิมพ์ชื่อตำบล/แขวง...',
  disabled = false,
  required = false,
  error,
}: AddressAutocompleteProps) => {
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;
  const [query, setQuery] = useState('');
  const searchBySubDistrict = useAddressStore(state => state.searchBySubDistrict);

  const filteredAddresses = useMemo(() => {
    if (query.length < 1) return [];
    return searchBySubDistrict(query).slice(0, 10); // Limit to 10 results
  }, [query, searchBySubDistrict]);

  const formatDisplayValue = (address: ThaiAddress | null): string => {
    if (!address) return '';
    return address.subDistrictName; // Only show subdistrict in the input field
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}

      <Combobox value={value} onChange={onChange} disabled={isDisabled}>
        <div className="relative">
          <ComboboxInput
            className={clsx(
              'block w-full px-3 py-2 pr-16 border rounded-lg text-sm transition-colors duration-200',
              'placeholder:text-gray-400',
              error
                ? 'border-danger text-danger-900 focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger'
                : 'border-gray-200 focus:ring-2 focus:ring-gray-200 focus:border-gray-400',
              isDisabled
                ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
                : 'bg-white hover:border-gray-300',
            )}
            displayValue={formatDisplayValue}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
          />

          {/* Clear button */}
          {value && !isDisabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-8 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              title="ล้างข้อมูล"
            >
              <Icon name="xmark" style="solid" className="w-4 h-4" />
            </button>
          )}

          {/* Dropdown button */}
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Icon
              name="chevron-down"
              style="solid"
              className="w-4 h-4 text-gray-400"
            />
          </ComboboxButton>

          <ComboboxOptions
            className={clsx(
              'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1',
              'shadow-lg ring-1 ring-black/5 focus:outline-none',
              'transition-opacity duration-100',
              'empty:hidden',
            )}
          >
            {query.length > 0 && filteredAddresses.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                ไม่พบข้อมูลที่ตรงกับ "{query}"
              </div>
            )}

            {filteredAddresses.map(address => (
              <ComboboxOption
                key={address.subDistrictCode}
                value={address}
                className={({ focus, selected }) =>
                  clsx(
                    'relative cursor-pointer select-none py-2.5 px-4 text-sm',
                    focus ? 'bg-gray-100 text-gray-900' : 'text-gray-900',
                    selected && 'bg-gray-100',
                  )
                }
              >
                {({ selected }) => (
                  <div className="flex items-center justify-between">
                    <span className={clsx(selected && 'font-medium')}>
                      {address.subDistrictName}, {address.districtName}, {address.provinceName}
                    </span>
                    {selected && (
                      <Icon name="check" style="solid" className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                )}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </div>
      </Combobox>

      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
};

export default AddressAutocomplete;
