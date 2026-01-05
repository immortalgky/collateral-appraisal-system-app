import { type FormField, FormFields } from '@/shared/components/form';
import { SectionHeader } from '@shared/components';

const AddressForm = () => {
  return (
    <div>
      <SectionHeader title="Location" />
      <div className="grid grid-cols-6 gap-4">
        <FormFields fields={addressFields} namePrefix="detail.address" />
        <FormFields fields={contactFields} namePrefix="detail.contact" />
      </div>
    </div>
  );
};

const addressFields: FormField[] = [
  // Basic address fields
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

  // Location selector (sub-district autocomplete that populates district, province, postcode)
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'detail.address.district',
    districtNameField: 'detail.address.districtName',
    provinceField: 'detail.address.province',
    provinceNameField: 'detail.address.provinceName',
    postcodeField: 'detail.address.postcode',
    subDistrictNameField: 'detail.address.subDistrictName',
    wrapperClassName: 'col-span-3',
  },

  // Display fields (autopopulated by location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Postcode',
    name: 'postcode',
    disabled: true,
    wrapperClassName: 'col-span-3',
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
