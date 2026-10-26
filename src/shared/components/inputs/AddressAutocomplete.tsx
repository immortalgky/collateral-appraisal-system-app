import { useId, useState, useMemo } from 'react';
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';
import clsx from 'clsx';
import Icon from '../Icon';
import { useAddressStore } from '@/shared/store';
import { useAddressesQuery } from '@/shared/api/addresses';
import type { ThaiAddress } from '@/shared/data/thaiAddresses';
import type { AddressSource } from '@/shared/types';
import { useFormReadOnly } from '../form/context';
import { useFormLayout } from '../form/formLayoutContext';
import { ValidationText } from '../form/ValidationText';
import { controlFrame, controlPad, controlSkin, ERROR_TEXT, REQUIRED_MARK } from './controlStyles';

/**
 * The address master has thousands of rows ("หนอง" alone matches ~600 sub-districts), so the list is
 * capped. searchBySubDistrict returns everything ranked, and the surplus is reported in the footer
 * below rather than being dropped silently.
 */
const MAX_VISIBLE_RESULTS = 50;

interface AddressAutocompleteProps {
  value: ThaiAddress | null;
  onChange: (address: ThaiAddress | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  addressSource?: AddressSource;
}

const AddressAutocomplete = ({
  value,
  onChange,
  label,
  placeholder = 'พิมพ์ชื่อตำบล/แขวง (เว้นวรรคเพื่อระบุอำเภอ/จังหวัด)',
  disabled = false,
  required = false,
  error,
  addressSource,
}: AddressAutocompleteProps) => {
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;
  const layout = useFormLayout();
  const errorId = useId();
  const [query, setQuery] = useState('');
  const searchBySubDistrict = useAddressStore(state => state.searchBySubDistrict);
  const titleAddresses = useAddressStore(state => state.titleAddresses);
  const dopaAddresses = useAddressStore(state => state.dopaAddresses);

  // The layouts already mount this query; react-query dedupes by key and the entry is
  // staleTime: Infinity, so reading it here costs nothing and does not refetch. It is the
  // only way to tell "still loading" from "loaded and empty" — the store looks the same.
  const { titleQuery, dopaQuery } = useAddressesQuery();

  const isLoadingAddresses =
    addressSource === 'title'
      ? titleQuery.isPending
      : addressSource === 'dopa'
        ? dopaQuery.isPending
        : titleQuery.isPending || dopaQuery.isPending;

  // An empty store *after* the fetch settled means the address master never loaded (API down)
  // rather than "nothing matched", so the empty state can tell the two apart instead of
  // blaming the user's query.
  const hasAddressData =
    addressSource === 'title'
      ? titleAddresses.length > 0
      : addressSource === 'dopa'
        ? dopaAddresses.length > 0
        : titleAddresses.length > 0 || dopaAddresses.length > 0;

  // Trimmed once, here: a whitespace-only query is not a query. searchBySubDistrict already
  // returns [] for it, so without this the "ไม่พบข้อมูล" empty state would appear for a lone space.
  const trimmedQuery = query.trim();

  const { filteredAddresses, totalMatches } = useMemo(() => {
    if (trimmedQuery.length < 1) return { filteredAddresses: [], totalMatches: 0 };
    const matches = searchBySubDistrict(trimmedQuery, addressSource);
    return {
      filteredAddresses: matches.slice(0, MAX_VISIBLE_RESULTS),
      totalMatches: matches.length,
    };
  }, [trimmedQuery, searchBySubDistrict, addressSource]);

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
        <label className="block text-xs font-medium text-(--palette-ink) mb-1">
          {label}
          {required && <span className={REQUIRED_MARK}>*</span>}
        </label>
      )}

      <Combobox value={value} onChange={onChange} disabled={isDisabled}>
        <div className="relative">
          <ComboboxInput
            className={clsx(
              // The form-system box (17.3); the right inset holds the clear button and chevron.
              'block w-full pr-16',
              controlFrame(layout),
              controlPad(layout, false, 'l'),
              controlSkin({ error: !!error, disabled: isDisabled }),
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            displayValue={formatDisplayValue}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
          />

          {/* Clear button */}
          {value && !isDisabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-8 flex items-center text-base text-(--palette-gray-400) hover:text-(--palette-gray-600) transition-colors"
              title="ล้างข้อมูล"
            >
              <Icon name="xmark" style="solid" />
            </button>
          )}

          {/* Dropdown button */}
          <ComboboxButton className="absolute inset-y-0 right-[0.7857rem] flex items-center text-base text-(--palette-ink-2)">
            <Icon name="chevron-down" style="solid" />
          </ComboboxButton>

          <ComboboxOptions
            className={clsx(
              'absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg py-1',
              'bg-(--palette-surface) text-(--palette-ink) border border-(--palette-line)',
              'shadow-lg focus:outline-none',
              'transition-opacity duration-100',
              'empty:hidden',
            )}
          >
            {trimmedQuery.length > 0 && filteredAddresses.length === 0 && (
              <div className="px-4 py-3 text-sm text-(--palette-gray-500) text-center">
                {isLoadingAddresses
                  ? 'กำลังโหลดข้อมูลที่อยู่...'
                  : hasAddressData
                    ? `ไม่พบข้อมูลที่ตรงกับ "${trimmedQuery}"`
                    : 'ไม่สามารถโหลดข้อมูลที่อยู่ได้ กรุณาลองใหม่อีกครั้ง'}
              </div>
            )}

            {filteredAddresses.map(address => (
              <ComboboxOption
                key={address.subDistrictCode}
                value={address}
                className={({ focus, selected }) =>
                  clsx(
                    'relative cursor-pointer select-none py-2.5 px-4 text-sm leading-normal text-(--palette-ink)',
                    // Same option look as `Dropdown` (17.3): highlight, then the selected wash.
                    focus ? 'bg-(--palette-surface-3)' : selected && 'bg-(--palette-accent-wash)',
                  )
                }
              >
                {({ selected }) => (
                  <div className="flex items-center justify-between">
                    <span className={clsx(selected && 'font-medium')}>
                      {address.subDistrictName}, {address.districtName}, {address.provinceName}
                    </span>
                    {selected && (
                      <Icon name="check" style="solid" className="text-(--palette-gray-600)" />
                    )}
                  </div>
                )}
              </ComboboxOption>
            ))}

            {totalMatches > filteredAddresses.length && (
              <div className="border-t border-(--palette-line-soft) mt-1 px-4 py-2 text-xs text-(--palette-gray-500) text-center">
                แสดง {filteredAddresses.length} จาก {totalMatches} รายการ —
                เว้นวรรคแล้วพิมพ์ชื่ออำเภอหรือจังหวัดเพื่อค้นหาให้แคบลง
              </div>
            )}
          </ComboboxOptions>
        </div>
      </Combobox>

      {error && (
        <p id={errorId} className={clsx('mt-1', ERROR_TEXT)}>
          <ValidationText message={error} label={label} />
        </p>
      )}
    </div>
  );
};

export default AddressAutocomplete;
