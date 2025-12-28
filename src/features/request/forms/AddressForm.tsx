import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { type FormField, FormFields } from '@/shared/components/form';
import { SectionHeader } from '@shared/components';
import AddressAutocomplete from '@/shared/components/inputs/AddressAutocomplete';
import TextInput from '@/shared/components/inputs/TextInput';
import type { ThaiAddress } from '@/shared/data/thaiAddresses';

const AddressForm = () => {
  const { setValue, watch } = useFormContext();
  const [selectedAddress, setSelectedAddress] = useState<ThaiAddress | null>(null);

  // Watch codes for form state (sent to API)
  const postcode = watch('detail.address.postcode');

  const handleAddressSelect = (address: ThaiAddress | null) => {
    setSelectedAddress(address);
    if (address) {
      // Store codes and names
      setValue('detail.address.subDistrict', address.subDistrictCode);
      setValue('detail.address.subDistrictName', address.subDistrictName);
      setValue('detail.address.district', address.districtCode);
      setValue('detail.address.districtName', address.districtName);
      setValue('detail.address.province', address.provinceCode);
      setValue('detail.address.provinceName', address.provinceName);
      setValue('detail.address.postcode', address.postcode);
    } else {
      setValue('detail.address.subDistrict', '');
      setValue('detail.address.subDistrictName', '');
      setValue('detail.address.district', '');
      setValue('detail.address.districtName', '');
      setValue('detail.address.province', '');
      setValue('detail.address.provinceName', '');
      setValue('detail.address.postcode', '');
    }
  };

  return (
    <div>
      <SectionHeader title="Location" />
      <div className="grid grid-cols-6 gap-4">
        <FormFields fields={addressFieldsTop} namePrefix={'detail.address'} />

        {/* Address autocomplete row */}
        <div className="col-span-3">
          <AddressAutocomplete
            label="Sub District"
            value={selectedAddress}
            onChange={handleAddressSelect}
          />
        </div>

        <div className="col-span-3">
          <TextInput
            label="District"
            value={selectedAddress?.districtName || ''}
            onChange={() => {}}
            disabled
          />
        </div>

        <div className="col-span-3">
          <TextInput
            label="Province"
            value={selectedAddress?.provinceName || ''}
            onChange={() => {}}
            disabled
          />
        </div>

        <div className="col-span-3">
          <TextInput
            label="Postcode"
            value={selectedAddress?.postcode || postcode || ''}
            onChange={() => {}}
            disabled
          />
        </div>

        <FormFields fields={contactFields} namePrefix={'detail.contact'} />
      </div>
    </div>
  );
};

// Address fields before the autocomplete row
const addressFieldsTop: FormField[] = [
  {
    type: 'text-input',
    label: 'House No',
    name: 'houseNumber',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Village/Building',
    name: 'projectName',
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'text-input',
    label: 'Moo',
    name: 'moo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'soi',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Road',
    name: 'road',
    wrapperClassName: 'col-span-2',
  },
];

const contactFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Contact Person Name',
    name: 'contactPersonName',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Contact Person Phone No',
    name: 'contactPersonPhone',
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'dropdown',
    label: 'Dealer Code',
    name: 'dealerCode',
    wrapperClassName: 'col-span-6',
    options: [
      {
        value: 'a',
        label: 'A',
      },
      {
        value: 'b',
        label: 'B',
      },
    ],
  },
];

export default AddressForm;
