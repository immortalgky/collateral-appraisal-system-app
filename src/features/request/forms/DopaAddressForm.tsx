import { useState } from 'react';
import { FormFields, type FormField } from '@/shared/components/form';
import TitleInformationHeader from '../components/TitleInformationHeader';
import { useFormContext } from 'react-hook-form';
import AddressAutocomplete from '@/shared/components/inputs/AddressAutocomplete';
import TextInput from '@/shared/components/inputs/TextInput';
import type { ThaiAddress } from '@/shared/data/thaiAddresses';

interface DopaAdressFormProps {
  index: number;
}

const DopaAdressForm = ({ index }: DopaAdressFormProps) => {
  const { getValues, setValue, watch } = useFormContext();
  const [selectedAddress, setSelectedAddress] = useState<ThaiAddress | null>(null);

  const prefix = `titles.${index}.dopaAddress`;
  const postcode = watch(`${prefix}.postcode`);

  const handleCopy = () => {
    const titleAddress = getValues(`titles.${index}.titleAddress`);
    setValue(`${prefix}.subDistrict`, titleAddress.subDistrict);
    setValue(`${prefix}.subDistrictName`, titleAddress.subDistrictName);
    setValue(`${prefix}.district`, titleAddress.district);
    setValue(`${prefix}.districtName`, titleAddress.districtName);
    setValue(`${prefix}.province`, titleAddress.province);
    setValue(`${prefix}.provinceName`, titleAddress.provinceName);
    setValue(`${prefix}.postcode`, titleAddress.postcode);
    setValue(`${prefix}.houseNumber`, titleAddress.houseNumber);
    setValue(`${prefix}.projectName`, titleAddress.projectName);
    setValue(`${prefix}.moo`, titleAddress.moo);
    setValue(`${prefix}.soi`, titleAddress.soi);
    setValue(`${prefix}.road`, titleAddress.road);
  };

  const handleAddressSelect = (address: ThaiAddress | null) => {
    setSelectedAddress(address);
    if (address) {
      setValue(`${prefix}.subDistrict`, address.subDistrictCode);
      setValue(`${prefix}.subDistrictName`, address.subDistrictName);
      setValue(`${prefix}.district`, address.districtCode);
      setValue(`${prefix}.districtName`, address.districtName);
      setValue(`${prefix}.province`, address.provinceCode);
      setValue(`${prefix}.provinceName`, address.provinceName);
      setValue(`${prefix}.postcode`, address.postcode);
    } else {
      setValue(`${prefix}.subDistrict`, '');
      setValue(`${prefix}.subDistrictName`, '');
      setValue(`${prefix}.district`, '');
      setValue(`${prefix}.districtName`, '');
      setValue(`${prefix}.province`, '');
      setValue(`${prefix}.provinceName`, '');
      setValue(`${prefix}.postcode`, '');
    }
  };

  return (
    <>
      <TitleInformationHeader title="DOPA address" onCopy={handleCopy} className="col-span-6" />
      <FormFields fields={dopaAddressFieldsTop} namePrefix={'titles'} index={index} />

      {/* Address autocomplete row */}
      <div className="col-span-2">
        <AddressAutocomplete
          label="Sub District"
          value={selectedAddress}
          onChange={handleAddressSelect}
          required
        />
      </div>

      <div className="col-span-2">
        <TextInput
          label="District"
          value={selectedAddress?.districtName || ''}
          onChange={() => {}}
          disabled
          required
        />
      </div>

      <div className="col-span-2">
        <TextInput
          label="Province"
          value={selectedAddress?.provinceName || ''}
          onChange={() => {}}
          disabled
          required
        />
      </div>

      <div className="col-span-2">
        <TextInput
          label="Postcode"
          value={selectedAddress?.postcode || postcode || ''}
          onChange={() => {}}
          disabled
        />
      </div>
    </>
  );
};

// Fields before the autocomplete row
export const dopaAddressFieldsTop: FormField[] = [
  {
    type: 'text-input',
    label: 'House No',
    name: 'dopaAddress.houseNumber',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Village/Building Name',
    name: 'dopaAddress.projectName',
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'text-input',
    label: 'Moo',
    name: 'dopaAddress.moo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'dopaAddress.soi',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Road',
    name: 'dopaAddress.road',
    wrapperClassName: 'col-span-2',
  },
];

export default DopaAdressForm;
