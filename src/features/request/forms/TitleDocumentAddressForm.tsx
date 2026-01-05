import { useState } from 'react';
import { type FormField, FormFields } from '@/shared/components/form';
import TitleInformationHeader from '../components/TitleInformationHeader';
import { useFormContext } from 'react-hook-form';
import type { ThaiAddress } from '@/shared/data/thaiAddresses';

interface TitleDocumentAdressFormProps {
  index: number;
}

const TitleDocumentAddressForm = ({ index }: TitleDocumentAdressFormProps) => {
  const { getValues, setValue, watch } = useFormContext();
  const [selectedAddress, setSelectedAddress] = useState<ThaiAddress | null>(null);

  const prefix = `titles.${index}.titleAddress`;
  const postcode = watch(`${prefix}.postcode`);

  const handleCopy = () => {
    const mainAddress = getValues('detail.address');
    setValue(`${prefix}.subDistrict`, mainAddress.subDistrict);
    setValue(`${prefix}.subDistrictName`, mainAddress.subDistrictName);
    setValue(`${prefix}.district`, mainAddress.district);
    setValue(`${prefix}.districtName`, mainAddress.districtName);
    setValue(`${prefix}.province`, mainAddress.province);
    setValue(`${prefix}.provinceName`, mainAddress.provinceName);
    setValue(`${prefix}.postcode`, mainAddress.postcode);
    setValue(`${prefix}.houseNumber`, mainAddress.houseNumber);
    setValue(`${prefix}.projectName`, mainAddress.projectName);
    setValue(`${prefix}.moo`, mainAddress.moo);
    setValue(`${prefix}.soi`, mainAddress.soi);
    setValue(`${prefix}.road`, mainAddress.road);
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
      <TitleInformationHeader
        title="Title document address"
        onCopy={handleCopy}
        className="col-span-6"
      />
      <FormFields fields={titleAddressFieldsTop} namePrefix={'titles'} index={index} />

      {/* Address autocomplete row */}
      {/*<div className="col-span-2">*/}
      {/*  <AddressAutocomplete*/}
      {/*    label="Sub District"*/}
      {/*    value={selectedAddress}*/}
      {/*    onChange={handleAddressSelect}*/}
      {/*    required*/}
      {/*  />*/}
      {/*</div>*/}

      {/*<div className="col-span-2">*/}
      {/*  <TextInput*/}
      {/*    label="District"*/}
      {/*    value={selectedAddress?.districtName || ''}*/}
      {/*    onChange={() => {}}*/}
      {/*    disabled*/}
      {/*    required*/}
      {/*  />*/}
      {/*</div>*/}

      {/*<div className="col-span-2">*/}
      {/*  <TextInput*/}
      {/*    label="Province"*/}
      {/*    value={selectedAddress?.provinceName || ''}*/}
      {/*    onChange={() => {}}*/}
      {/*    disabled*/}
      {/*    required*/}
      {/*  />*/}
      {/*</div>*/}

      {/*<div className="col-span-2">*/}
      {/*  <TextInput*/}
      {/*    label="Postcode"*/}
      {/*    value={selectedAddress?.postcode || postcode || ''}*/}
      {/*    onChange={() => {}}*/}
      {/*    disabled*/}
      {/*  />*/}
      {/*</div>*/}
    </>
  );
};

// Fields before the autocomplete row
export const titleAddressFieldsTop: FormField[] = [
  {
    type: 'text-input',
    label: 'House No',
    name: 'titleAddress.houseNumber',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Village/Building Name',
    name: 'titleAddress.projectName',
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'text-input',
    label: 'Moo',
    name: 'titleAddress.moo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'titleAddress.soi',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Road',
    name: 'titleAddress.road',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'titleAddress.subDistrict',
    districtField: 'titleAddress.district',
    districtNameField: 'titleAddress.districtName',
    provinceField: 'titleAddress.province',
    provinceNameField: 'titleAddress.provinceName',
    postcodeField: 'titleAddress.postcode',
    subDistrictNameField: 'titleAddress.subDistrictName',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'titleAddress.districtName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'titleAddress.provinceName',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Postcode',
    name: 'titleAddress.postcode',
    disabled: true,
    wrapperClassName: 'col-span-2',
  },
];

export default TitleDocumentAddressForm;
