import { useState, useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useFormReadOnly } from '../form/context';
import AddressAutocomplete from './AddressAutocomplete';
import { type ThaiAddress, findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';

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
}: LocationSelectorProps) => {
  const { setValue, watch } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;

  const [selectedAddress, setSelectedAddress] = useState<ThaiAddress | null>(null);

  // Watch sub-district code for form state
  const subDistrictCode = watch(name);

  // Look up address from code when loading from API (selectedAddress is null but code exists)
  const displayAddress = useMemo(() => {
    if (selectedAddress) return selectedAddress;
    if (subDistrictCode) {
      return findAddressBySubDistrictCode(subDistrictCode) || null;
    }
    return null;
  }, [selectedAddress, subDistrictCode]);

  // Sync selectedAddress when form is reset with API data
  useEffect(() => {
    if (!selectedAddress && subDistrictCode) {
      const found = findAddressBySubDistrictCode(subDistrictCode);
      if (found) {
        setSelectedAddress(found);

        // Populate name fields for display when loading from API
        if (subDistrictNameField) {
          setValue(subDistrictNameField, found.subDistrictName);
        }
        if (districtNameField) {
          setValue(districtNameField, found.districtName);
        }
        if (provinceNameField) {
          setValue(provinceNameField, found.provinceName);
        }
      }
    }
  }, [subDistrictCode, selectedAddress, setValue, subDistrictNameField, districtNameField, provinceNameField]);

  const handleAddressSelect = (address: ThaiAddress | null) => {
    setSelectedAddress(address);
    if (address) {
      // Store codes
      setValue(name, address.subDistrictCode, { shouldDirty: true });
      setValue(districtField, address.districtCode, { shouldDirty: true });
      setValue(provinceField, address.provinceCode, { shouldDirty: true });
      setValue(postcodeField, address.postcode, { shouldDirty: true });

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
      // Clear all fields
      setValue(name, '', { shouldDirty: true });
      setValue(districtField, '', { shouldDirty: true });
      setValue(provinceField, '', { shouldDirty: true });
      setValue(postcodeField, '', { shouldDirty: true });

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
      />
    </div>
  );
};

export default LocationSelector;
