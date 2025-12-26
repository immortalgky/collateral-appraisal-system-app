import FormTable from '@/features/request/components/tables/FormTable';
import Input from '@/shared/components/Input';
import type { AreaDetailDtoType } from '@/shared/forms/typeCondo';
import { useController, useFormContext, useWatch } from 'react-hook-form';

interface CondoAreaDetailFormProps {
  name: string;
}
function CondoAreaDetailForm({ name }: CondoAreaDetailFormProps) {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name: name, control });

  const properties = useWatch({ name: `${name}.areaDetails` });
  const totalArea = calcTotalArea(properties);

  return (
    <div className="col-span-12 border-2 rounded-2xl border-gray-100">
      <FormTable headers={propertiesTableHeader} name={`${name}.areaDetails`} />
      <div className="px-6 pb-6">
        <Input
          type="number"
          {...field}
          label="Total Area (Sq. M.)"
          value={totalArea}
          error={error?.message}
          readOnly
          disabled
        />
      </div>
    </div>
  );
}

const propertiesTableHeader = [
  { name: 'areaDetail', label: 'Area Detail' },
  { name: 'area', label: 'Area', inputType: 'number' },
];

function calcTotalArea(properties: AreaDetailDtoType[]): number {
  return properties.reduce((acc, property) => acc + convertToNumber(property.area, 0), 0);
}

function convertToNumber(n: any, fallback: number): number {
  const number = Number(n);
  return isNaN(number) ? fallback : number;
}

export default CondoAreaDetailForm;
