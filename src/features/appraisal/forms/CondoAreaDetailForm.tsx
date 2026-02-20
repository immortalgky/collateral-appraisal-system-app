import FormTable from '@/features/request/components/tables/FormTable';
import Input from '@/shared/components/Input';
import type { AreaDetailDtoType } from '@/shared/schemas/v1';
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

  const properties = useWatch({ name: `${name}` });
  const totalArea = calcTotalArea(properties);

  return (
    <div className="col-span-12 border-2 rounded-2xl border-gray-100">
      <FormTable headers={propertiesTableHeader} name={`${name}`} />
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
  { name: 'areaDescription', label: 'Area Detail' },
  { name: 'areaSize', label: 'Area', inputType: 'number' as const },
];
function calcTotalArea(properties: AreaDetailDtoType[]): number {
  if (!properties || !Array.isArray(properties)) return 0;
  return properties.reduce((acc, property) => acc + convertToNumber(property.areaSize, 0), 0);
}

function convertToNumber(n: any, fallback: number): number {
  const number = Number(n);
  return isNaN(number) ? fallback : number;
}

export default CondoAreaDetailForm;
