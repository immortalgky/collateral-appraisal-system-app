import { useState, useEffect, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { useFormReadOnly } from '../form/context';
import AddressAutocomplete from './AddressAutocomplete';
import { type ThaiAddress, findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import type { AddressSource } from '@/shared/types';

interface LocationSelectorProps {
  /** Form path for sub-district code (display field) */
  name: string;
  label?: string;
  placeholder?: string;
  /** Form path for district code */
  districtField: string;
  /** Form path for district name (optional) */
  districtNameField?: string;
  /** Form path for province code */
  provinceField: string;
  /** Form path for province name (optional) */
  provinceNameField?: string;
  /** Form path for postcode */
  postcodeField: string;
  /** Form path for sub-district name (optional) */
  subDistrictNameField?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  /** Which address dataset to search: 'title' | 'dopa'. Defaults to searching both. */
  addressSource?: AddressSource;
  /**
   * Resolve an ALREADY-STORED code against both masters, while the picker still offers only
   * `addressSource`.
   *
   * For a form whose source has been changed after rows were saved. The two masters diverged in
   * 2026-07 and 3,715 Title sub-district codes exist in no DOPA table, so resolving a stored code
   * strictly against the new source leaves the field blank on a record nobody has edited — while
   * the disabled district and province inputs go on showing their saved names. Reading from both
   * keeps those records legible; the choice offered for a NEW pick is unaffected.
   */
  resolveFromAnySource?: boolean;
}

const LocationSelector = ({
  name,
  label,
  placeholder,
  districtField,
  districtNameField,
  provinceField,
  provinceNameField,
  postcodeField,
  subDistrictNameField,
  disabled = false,
  required = false,
  error,
  className,
  addressSource,
  resolveFromAnySource = false,
}: LocationSelectorProps) => {
  const { setValue, watch } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;

  // Stable ref for setValue to avoid re-triggering effects when its reference changes
  const setValueRef = useRef(setValue);
  setValueRef.current = setValue;

  const [selectedAddress, setSelectedAddress] = useState<ThaiAddress | null>(null);

  // undefined makes findAddressBySubDistrictCode search both datasets, title first.
  const resolveSource = resolveFromAnySource ? undefined : addressSource;

  // Watch sub-district code for form state
  const subDistrictCode = watch(name);

  // Look up address from code when loading from API (selectedAddress is null but code exists)
  const displayAddress = useMemo(() => {
    if (selectedAddress) return selectedAddress;
    if (subDistrictCode) {
      return findAddressBySubDistrictCode(subDistrictCode, resolveSource) || null;
    }
    return null;
  }, [selectedAddress, subDistrictCode, resolveSource]);

  // Sync selectedAddress when form is reset with API data
  useEffect(() => {
    if (subDistrictCode) {
      const found = findAddressBySubDistrictCode(subDistrictCode, resolveSource);
      if (found) {
        setSelectedAddress(found);

        // Populate code fields (self-heal if DB has nulls)
        setValueRef.current(districtField, found.districtCode);
        setValueRef.current(provinceField, found.provinceCode);
        setValueRef.current(postcodeField, found.postcode);

        // Populate name fields for display when loading from API
        if (subDistrictNameField) {
          setValueRef.current(subDistrictNameField, found.subDistrictName);
        }
        if (districtNameField) {
          setValueRef.current(districtNameField, found.districtName);
        }
        if (provinceNameField) {
          setValueRef.current(provinceNameField, found.provinceName);
        }
      }
    } else {
      setSelectedAddress(null);
    }
  }, [subDistrictCode, subDistrictNameField, districtNameField, provinceNameField, resolveSource]);

  const handleAddressSelect = (address: ThaiAddress | null) => {
    setSelectedAddress(address);
    if (address) {
      // Store codes (shouldValidate clears any stale "required" error)
      setValue(name, address.subDistrictCode, { shouldDirty: true, shouldValidate: true });
      setValue(districtField, address.districtCode, { shouldDirty: true, shouldValidate: true });
      setValue(provinceField, address.provinceCode, { shouldDirty: true, shouldValidate: true });
      setValue(postcodeField, address.postcode, { shouldDirty: true, shouldValidate: true });

      // Store names if fields are specified
      if (subDistrictNameField) {
        setValue(subDistrictNameField, address.subDistrictName, { shouldDirty: true });
      }
      if (districtNameField) {
        setValue(districtNameField, address.districtName, { shouldDirty: true });
      }
      if (provinceNameField) {
        setValue(provinceNameField, address.provinceName, { shouldDirty: true });
      }
    } else {
      // Clear all fields (shouldValidate re-applies "required" error when emptied)
      setValue(name, '', { shouldDirty: true, shouldValidate: true });
      setValue(districtField, '', { shouldDirty: true, shouldValidate: true });
      setValue(provinceField, '', { shouldDirty: true, shouldValidate: true });
      setValue(postcodeField, '', { shouldDirty: true, shouldValidate: true });

      if (subDistrictNameField) {
        setValue(subDistrictNameField, '', { shouldDirty: true });
      }
      if (districtNameField) {
        setValue(districtNameField, '', { shouldDirty: true });
      }
      if (provinceNameField) {
        setValue(provinceNameField, '', { shouldDirty: true });
      }
    }
  };

  return (
    <div className={className}>
      <AddressAutocomplete
        label={label}
        value={displayAddress}
        onChange={handleAddressSelect}
        placeholder={placeholder}
        disabled={isDisabled}
        required={required}
        error={error}
        addressSource={addressSource}
      />
    </div>
  );
};

export default LocationSelector;
