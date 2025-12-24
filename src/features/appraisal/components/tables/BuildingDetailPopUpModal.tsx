import { Button, FormBooleanToggle, NumberInput, TextInput } from '@/shared/components';
import { useFormContext } from 'react-hook-form';
import BuildingDetailTable from '../BuildingTable/BuildingDetailTable';

function BuildingDetailPopUpModal({ name, index, onClose, outScopeFields }) {
  const { register } = useFormContext();

  const handleOnClose = () => {
    onClose(undefined);
  };

  const handleOnCancel = () => {
    onClose(undefined);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="grid grid-rows-12 gap-4 w-3/4 bg-white rounded-xl h-3/4  p-7 overflow-clip">
        <div className="row-span-2 flex gap-4">
          <div className="col-span-3">
            <TextInput {...register(`${name}.${index}.areaDescription`)} label="Detail"></TextInput>
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
        <div className="row-span-8">
          <BuildingDetailTable
            headers={propertiesTableHeader}
            name={`${name}.${index}.buildingDepreciationMethods`}
            outScopeFields={outScopeFields}
          />
        </div>
        <div className="row-span-2">
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
    type: 'input-number',
    name: 'fromYear',
    headerName: 'From Year',
    className: 'w-[100px]',
    align: 'right',
  },
  { type: 'input-number', name: 'toYear', headerName: 'To Year', className: 'w-[100px]' },
  {
    type: 'input-number',
    name: 'depreciationPercentPerYear',
    headerName: 'Depreciation Per Year (%)',
    className: 'w-[100px]',
    align: 'right',

    footer: (values: any) => {
      if (!Array.isArray(values)) return 0;
      if (values.length === 0) return 0;

      const sum = Number(
        values.reduce((prev: number, curr: number) => prev + curr, 0),
      ).toLocaleString();
      const average = sum / values.length;
      return <span>{`Average: ${average} %`}</span>;
    },
  },
  {
    type: 'derived',
    name: 'totalPriceBeforeDepreciation',
    headerName: 'Total Price before Depreciation',
    align: 'right',
    className: 'w-[200px]',
    modifier: (value: number) => {
      return Number(value) ? Number(value).toLocaleString() : value;
    },
    compute: ({ outScopeFields }) => {
      const area = outScopeFields['area'];
      const pricePerSqm = outScopeFields['pricePerSqm'];
      return area * pricePerSqm;
    },
  },
  {
    type: 'derived',
    name: 'totalDepreciationPercent',
    headerName: 'Total Depreciation Per Year (%)',
    align: 'right',

    compute: ({ row }) => {
      const prevDepre = row['depreciationPercentPerYear'];
      const currFromYear = row['fromYear'];
      const currToYear = row['toYear'];
      return (currToYear - currFromYear) * prevDepre;
    },

    footer: (values: any) => {
      const sum = Number(
        values.reduce((prev: number, curr: number) => prev + curr, 0),
      ).toLocaleString();
      return <span>{`Total: ${sum} %`}</span>;
    },
  },
  {
    type: 'derived',
    name: 'depreciationPrice',
    headerName: 'Price After Depreciation',
    align: 'right',

    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row, outScopeFields }) => {
      const area = outScopeFields['area'];
      const pricePerSqm = outScopeFields['pricePerSqm'];
      const depre = row['totalDepreciationPercent'] / 100;
      const priceAfterDepre = area * pricePerSqm * depre;
      return priceAfterDepre;
    },

    footer: (values: any) => {
      const sum = Number(
        values.reduce((prev: number, curr: number) => prev + curr, 0),
      ).toLocaleString();
      return <span>{`Total: ${sum}`}</span>;
    },
  },
];

export default BuildingDetailPopUpModal;
