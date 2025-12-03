import Input from '@/shared/components/Input';
import FormTable from '../components/tables/FormTable';
import { useController, useFormContext, useWatch } from 'react-hook-form';
import type { RequestPropertyDtoType } from '@/shared/forms/v1';
import FormCard from '@/shared/components/sections/FormCard';

const PropertiesForm = () => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name: 'loanDetail.totalSellingPrice', control });

  const properties = useWatch({ name: 'properties' });
  const totalSellingPrice = calcTotalPrice(properties);

  return (
    <FormCard title="Properties" noPadding>
      <div>
        <FormTable headers={propertiesTableHeader} name={'properties'} />
        <div className="px-6 pb-6">
          <Input
            type="number"
            {...field}
            label="Total Selling Price"
            value={totalSellingPrice}
            error={error?.message}
            readOnly
          />
        </div>
      </div>
    </FormCard>
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
