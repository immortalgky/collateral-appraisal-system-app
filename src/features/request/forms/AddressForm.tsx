import SectionHeader from '@/shared/components/sections/SectionHeader';
import type { FormField } from '../../../shared/components/sections/FormSection';
import FormSection from '../../../shared/components/sections/FormSection';

const AddressForm = () => {
  return (
    <>
      <SectionHeader title="Location" />
      <div className="grid grid-cols-6 gap-3">
        <FormSection fields={addressFields} namePrefix={'address'} />
        <FormSection fields={contactFields} namePrefix={'contact'} />
      </div>
    </>
  );
};

export const addressFields: FormField[] = [
  {
    type: 'text-input',
    label: 'House No',
    name: 'houseNo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Room No',
    name: 'roomNo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Floor No',
    name: 'floorNo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Village/Building',
    name: 'villageBuilding',
    wrapperClassName: 'col-span-6',
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
  {
    type: 'text-input',
    label: 'Sub District',
    name: 'subDistrict',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'district',
    wrapperClassName: 'col-span-3',
    disabled: true,
    required: true,
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'province',
    wrapperClassName: 'col-span-3',
    disabled: true,
    required: true,
  },
  {
    type: 'text-input',
    label: 'Postcode',
    name: 'postcode',
    wrapperClassName: 'col-span-3',
    disabled: true,
  },
];
export const contactFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Contact Person Name',
    name: 'contactPersonName',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Contact Person Phone No',
    name: 'contactPersonContactNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Project Code',
    name: 'projectCode',
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
