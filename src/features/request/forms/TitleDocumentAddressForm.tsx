import type { FormField } from '@/shared/components/sections/FormSection';
import FormSection from '@/shared/components/sections/FormSection';
import TitleInformationHeader from '../components/TitleInformationHeader';
import { useFormContext } from 'react-hook-form';
import type { AddressDtoType } from '@/shared/forms/v1';

interface TitleDocumentAdressFormProps {
  index: number;
}

const TitleDocumentAdressForm = ({ index }: TitleDocumentAdressFormProps) => {
  const { getValues, setValue } = useFormContext();
  const handleCopy = () => {
    const addressValues: AddressDtoType = getValues('address');
    titleAddressFields.forEach(key => {
      const addressKey = key.name.split('.')[1];
      setValue(`titles.${index}.${key.name}`, addressValues[addressKey]);
    });
  };
  return (
    <>
      <TitleInformationHeader
        title="Title document address"
        onCopy={handleCopy}
        className="col-span-6"
      />
      <FormSection fields={titleAddressFields} namePrefix={'titles'} index={index} />
    </>
  );
};

export const titleAddressFields: FormField[] = [
  {
    type: 'text-input',
    label: 'House No',
    name: 'titleAddress.houseNo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Room No',
    name: 'titleAddress.roomNo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Floor No',
    name: 'titleAddress.floorNo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Village/Building Name',
    name: 'titleAddress.villageBuilding',
    wrapperClassName: 'col-span-6',
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
    type: 'text-input',
    label: 'Sub District',
    name: 'titleAddress.subDistrict',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'titleAddress.district',
    wrapperClassName: 'col-span-2',
    required: true,
    disabled: true,
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'titleAddress.province',
    wrapperClassName: 'col-span-2',
    required: true,
    disabled: true,
  },
  {
    type: 'text-input',
    label: 'Postcode',
    name: 'titleAddress.postcode',
    wrapperClassName: 'col-span-2',
    disabled: true,
  },
];

export default TitleDocumentAdressForm;
