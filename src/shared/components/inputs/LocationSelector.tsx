import { useState, useEffect, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { useFormReadOnly } from '../form/context';
import AddressAutocomplete from './AddressAutocomplete';
import { type ThaiAddress, findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import type { AddressSource } from '@/shared/types';

interface LocationSelectorProps {
  /** Form path for sub-district field */
  name: string;
  label?: string;
  placeholder?: string;
  /** Form path for district field */
  districtField: string;
  /** Form path for district name (optional) */
  districtNameField?: string;
  /** Form path for province field */
  provinceField: string;
  /** Form path for province name (optional) */
  provinceNameField?: string;
  /** Form path for postcode */
  postcodeField: string;
  /** Form path for sub-district name (optional) */
  subDistrictNameField?: string;
  disabled?: boolean;
  required?: boolean;
  /**
   * 'description' (title-address mode): user may type free text outside the list;
   * stores descriptions (names) in name/districtField/provinceField.
   * 'code' (default, dopa mode): user must select from list; stores codes.
   */
  valueFormat?: 'code' | 'description';
  error?: string;
  className?: string;
  /** Which address dataset to search: 'title' | 'dopa'. Defaults to searching both. */
  addressSource?: AddressSource;
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
  valueFormat = 'code',
  error,
  className,
  addressSource,
}: LocationSelectorProps) => {
  const { setValue, watch, trigger, clearErrors } = useFormContext();
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;
  const isDescription = valueFormat === 'description';

  // Stable ref for setValue to avoid re-triggering effects when its reference changes
  const setValueRef = useRef(setValue);
  setValueRef.current = setValue;

  const [selectedAddress, setSelectedAddress] = useState<ThaiAddress | null>(null);

  // In description mode, the watched value is the stored description/free-text.
  // In code mode, the watched value is the stored sub-district code.
  const subDistrictValue = watch(name);

  const displayAddress = useMemo(() => {
    if (selectedAddress) return selectedAddress;
    if (subDistrictValue) {
      if (isDescription) {
        // Value IS the display text — synthesise a display object, no lookup needed
        return { subDistrictName: subDistrictValue } as ThaiAddress;
      }
      return findAddressBySubDistrictCode(subDistrictValue, addressSource) || null;
    }
    return null;
  }, [selectedAddress, subDistrictValue, addressSource, isDescription]);

  useEffect(() => {
    if (subDistrictValue) {
      // In description mode, the value is the description (name) and we don't need to look up codes
      if (isDescription) {
        // Description mode: district/province are already stored as descriptions.
        // Just restore display state so the input isn't blank on load.
        setSelectedAddress({
          subDistrictName: subDistrictValue,
        } as ThaiAddress);
        return;
      }
      // Code mode: look up by code and self-heal any null district/province/postcode.
      const found = findAddressBySubDistrictCode(subDistrictValue, addressSource);
      if (found) {
        setSelectedAddress(found);
        setValueRef.current(districtField, found.districtCode);
        setValueRef.current(provinceField, found.provinceCode);
        setValueRef.current(postcodeField, found.postcode);
        if (subDistrictNameField) setValueRef.current(subDistrictNameField, found.subDistrictName);
        if (districtNameField) setValueRef.current(districtNameField, found.districtName);
        if (provinceNameField) setValueRef.current(provinceNameField, found.provinceName);
      }
    } else {
      if (!isDescription) setSelectedAddress(null);
    }
  }, [
    subDistrictValue,
    subDistrictNameField,
    districtNameField,
    provinceNameField,
    addressSource,
    isDescription,
  ]);

  // Explicit selection from the dropdown is the only thing that overrides
  // district/province — clear and free-text entry never touch them.
  const handleAddressSelect = (address: ThaiAddress | null) => {
    setSelectedAddress(address);
    if (address) {
      if (isDescription) {
        // Description mode: store names
        setValue(name, address.subDistrictName, { shouldDirty: true, shouldValidate: true });
        setValue(districtField, address.districtName, { shouldDirty: true, shouldValidate: true });
        setValue(provinceField, address.provinceName, { shouldDirty: true, shouldValidate: true });
        setValue(postcodeField, address.postcode, { shouldDirty: true, shouldValidate: true });
      } else {
        // Code mode: store codes
        setValue(name, address.subDistrictCode, { shouldDirty: true, shouldValidate: true });
        setValue(districtField, address.districtCode, { shouldDirty: true, shouldValidate: true });
        setValue(provinceField, address.provinceCode, { shouldDirty: true, shouldValidate: true });
        setValue(postcodeField, address.postcode, { shouldDirty: true, shouldValidate: true });
        if (subDistrictNameField && address.subDistrictName)
          setValue(subDistrictNameField, address.subDistrictName, { shouldDirty: true });
        if (districtNameField && address.districtName)
          setValue(districtNameField, address.districtName, { shouldDirty: true });
        if (provinceNameField && address.provinceName)
          setValue(provinceNameField, address.provinceName, { shouldDirty: true });
      }
    } else {
      // Clear: always clears sub-district and postcode
      setValue(name, '', { shouldDirty: true, shouldValidate: true });
      setValue(postcodeField, '', { shouldDirty: true, shouldValidate: true });
      if (subDistrictNameField) setValue(subDistrictNameField, '', { shouldDirty: true });

      if (!isDescription) {
        // Code mode (dopa): district/province are read-only display fields, clear them too
        setValue(districtField, '', { shouldDirty: true, shouldValidate: true });
        setValue(provinceField, '', { shouldDirty: true, shouldValidate: true });
        if (districtNameField) setValue(districtNameField, '', { shouldDirty: true });
        if (provinceNameField) setValue(provinceNameField, '', { shouldDirty: true });
      }
      // Description mode: district/province are independently editable, leave untouched
    }
  };

  // Free text typed (description mode only). Writes every keystroke into the sub-district
  // field, but skips shouldValidate — with zodResolver that would re-validate the entire form
  // schema on every character. clearErrors gives the same "error clears as you type" UX cheaply;
  // handleFreeTextBlur below runs the real validation once, when the user leaves the field.
  const handleFreeTextChange = (text: string) => {
    setSelectedAddress(prev => ({ ...prev, subDistrictName: text }) as ThaiAddress);
    setValue(name, text, { shouldDirty: true });
    if (text) clearErrors(name);
    if (subDistrictNameField) setValue(subDistrictNameField, '', { shouldDirty: true });
    // Clear stale postcode from the previously matched address
    if (selectedAddress) setValue(postcodeField, '', { shouldDirty: true });
  };

  const handleFreeTextBlur = () => {
    trigger(name);
  };

  return (
    <div className={className}>
      <AddressAutocomplete
        label={label}
        value={displayAddress}
        onChange={handleAddressSelect}
        onFreeTextChange={isDescription ? handleFreeTextChange : undefined}
        onFreeTextBlur={isDescription ? handleFreeTextBlur : undefined}
        placeholder={placeholder}
        disabled={isDisabled}
        required={required}
        editable={isDescription}
        error={error}
        addressSource={addressSource}
      />
    </div>
  );
};

export default LocationSelector;
