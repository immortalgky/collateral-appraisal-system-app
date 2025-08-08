import Input from '@/shared/components/Input';
import FormTable from '../components/tables/FormTable';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import type { RequestPropertyDtoType } from '@/shared/forms/v1';
import SectionHeader from '@/shared/components/sections/SectionHeader';

const PropertiesForm = () => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name: 'loanDetail.totalSellingPrice', control });

  const properties = useWatch({ name: 'properties' });
  const totalSellingPrice = calcTotalPrice(properties);

  return (
    <>
      <SectionHeader title="Properties" />
      <div>
        <FormTable headers={propertiesTableHeader} name={'properties'} />
        <Input
          type="number"
          {...field}
          label="Total Selling Price"
          value={totalSellingPrice}
          error={error?.message}
          readOnly
        />
      </div>
    </>
  );
};

const propertiesTableHeader = [
  { name: 'propertyType', label: 'Property Type' },
  { name: 'buildingType', label: 'Building Type' },
  { name: 'sellingPrice', label: 'Selling Price', inputType: 'number' },
];

function calcTotalPrice(properties: RequestPropertyDtoType[]): number {
  return properties.reduce((acc, property) => acc + convertToNumber(property.sellingPrice, 0), 0);
}

function convertToNumber(n: any, fallback: number): number {
  const number = Number(n);
  return isNaN(number) ? fallback : number;
}

export default PropertiesForm;
