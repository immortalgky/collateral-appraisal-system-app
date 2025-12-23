import { Button, FormBooleanToggle, NumberInput, TextInput } from '@/shared/components';
import { useFormContext } from 'react-hook-form';
import BuildingDetailTable from './BuildingDetailTable';

function BuildingDetailPopUpModal({ name, index, onClose, outScopeFields }) {
  const { register, control, getValues } = useFormContext();

  const handleOnClose = () => {
    onClose(undefined);
  };

  const handleOnCancel = () => {
    onClose(undefined);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="grid flex-col gap-4 w-3/4 bg-white rounded-xl h-3/4  p-7 overflow-clip">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <TextInput {...register(`${name}.${index}.detail`)} label="Detail"></TextInput>
          </div>
          <div className="col-span-2">
            <NumberInput
              {...register(`${name}.${index}.year`, {
                valueAsNumber: true,
              })}
              label="Year"
            ></NumberInput>
          </div>
          <div className="col-span-2">
            <NumberInput
              {...register(`${name}.${index}.area`, {
                valueAsNumber: true,
              })}
              label="Area"
            ></NumberInput>
          </div>
          <div className="col-span-2">
            <NumberInput
              {...register(`${name}.${index}.pricePerSqMeterBeforeDepreciation`, {
                valueAsNumber: true,
              })}
              label="Price Per Sq. Meter"
            ></NumberInput>
          </div>
          <div className="col-span-2">
            <FormBooleanToggle
              label="Is Building"
              options={['Yes', 'No']}
              name={`${name}.${index}.isBuilding`}
            />
          </div>
          <div className="col-span-2">
            <FormBooleanToggle
              label="Method"
              options={['Period', 'Gross']}
              name={`${name}.${index}.method`}
            />
          </div>
        </div>
        <div className="">
          <BuildingDetailTable
            headers={propertiesTableHeader}
            name={`${name}.${index}.buildingDepreciations`}
            outScopeFields={outScopeFields}
          />
        </div>
        <div className="bg-white p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="ghost" type="button" onClick={() => handleOnCancel()}>
                Cancel
              </Button>
              <div className="h-6 w-px bg-gray-200" />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleOnClose()}>Save</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const propertiesTableHeader = [
  {
    type: 'number',
    name: 'atYear',
    label: 'From Year',
    className: 'w-[100px]',
    render: (value, row, rowIndex) => <div>Test</div>,
  },
  { name: 'toYear', label: 'To Year', type: 'number', className: 'w-[100px]' },
  {
    type: 'number',
    name: 'depreciationPerYear',
    label: 'Depreciation Per Year (%)',
    align: 'right',
  },
  {
    type: 'text',
    name: 'totalDepreciationPerYear',
    label: 'Total Depreciation Per Year (%)',
    align: 'right',

    compute: ({ rows, row, rowIndex }) => {
      // const atYear = row['atYear'];
      // const toYear = row['toYear'];
      // const depre = row['depreciationPerYear'];
      // return (toYear - atYear) * depre;
      if (rowIndex - 1 >= 0) {
        const prevDepre = rows[rowIndex - 1]['depreciationPerYear'];
        const currAtYear = row['atYear'];
        const currToYear = row['toYear'];
        return (currToYear - currAtYear) * prevDepre;
      } else {
        const currAtYear = row['atYear'];
        const currToYear = row['toYear'];
        return (currToYear - currAtYear) * row['depreciationPerYear'];
      }
    },

    footer: (values: any) => {
      return (
        <span>
          Total:{' '}
          {Number(values.reduce((prev: number, curr: number) => prev + curr, 0)).toLocaleString()}
        </span>
      );
    },
  },
  {
    type: 'text',
    name: 'priceAfterDepreciation',
    label: 'Price After Depreciation',
    align: 'right',

    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ rows, row, rowIndex, getValues, outScopeFields }) => {
      const area = outScopeFields['area'];
      const pricePerSqm = outScopeFields['pricePerSqm'];
      const depre = row['depreciationPerYear'];
      const priceAfterDepre = area * pricePerSqm * depre;

      return priceAfterDepre;
    },

    footer: (values: any) => {
      return (
        <span>
          Total:{' '}
          {Number(values.reduce((prev: number, curr: number) => prev + curr, 0)).toLocaleString()}
        </span>
      );
    },
  },
];

export default BuildingDetailPopUpModal;
