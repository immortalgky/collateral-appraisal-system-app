import type { FormField } from '@/shared/components/sections/FormSection';
import FormSection from '@/shared/components/sections/FormSection';
import TitleInformationHeader from '../components/TitleInformationHeader';
import { useFormContext } from 'react-hook-form';
import type { TitleAddressType } from '@/shared/forms/v1';

interface DopaAdressFormProps {
  index: number;
}

const DopaAdressForm = ({ index }: DopaAdressFormProps) => {
  const { getValues, setValue } = useFormContext();
  const handleCopy = () => {
    const titleAddressValues: TitleAddressType = getValues(`titles.${index}.titleAddress`);
    dopaAddressFields.forEach(key => {
      const addressKey = key.name.split('.')[1];
      setValue(`titles.${index}.${key.name}`, titleAddressValues[addressKey]);
    });
  };
  return (
    <>
      <TitleInformationHeader title="DOPA address" onCopy={handleCopy} className="col-span-6" />
      <FormSection fields={dopaAddressFields} namePrefix={'titles'} index={index} />
    </>
  );
};

export const dopaAddressFields: FormField[] = [
  {
    type: 'text-input',
    label: 'House No',
    name: 'dopaAddress.houseNo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Room No',
    name: 'dopaAddress.roomNo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Floor No',
    name: 'dopaAddress.floorNo',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Village/Building No',
    name: 'dopaAddress.villageBuilding',
    wrapperClassName: 'col-span-6',
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
  {
    type: 'text-input',
    label: 'Sub District',
    name: 'dopaAddress.subDistrict',
    wrapperClassName: 'col-span-2',
    required: true,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'dopaAddress.district',
    wrapperClassName: 'col-span-2',
    required: true,
    disabled: true,
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'dopaAddress.province',
    wrapperClassName: 'col-span-2',
    required: true,
    disabled: true,
  },
  {
    type: 'text-input',
    label: 'Postcode',
    name: 'dopaAddress.postcode',
    wrapperClassName: 'col-span-2',
    disabled: true,
  },
];

export default DopaAdressForm;
