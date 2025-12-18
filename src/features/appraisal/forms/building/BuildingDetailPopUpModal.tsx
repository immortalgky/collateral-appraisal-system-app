import FormTable from '@/features/request/components/tables/FormTable';
import { NumberInput, TextInput } from '@/shared/components';
import { useEffect, useRef } from 'react';
import { useController, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import BuildingDetailTable from './BuildingDetailTable';

function BuildingDetailPopUpModal({ name, index, open }) {
  const { register, control } = useFormContext();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!dialogRef.current) return;
    open ? dialogRef.current.showModal() : dialogRef.current.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box w-11/12 max-w-5xl bg-white rounded-xl h-3/4">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-3">
            <TextInput {...register(`${name}.${index}.detail`)} label="Detail"></TextInput>
          </div>
          <div className="col-span-3">
            <NumberInput
              {...register(`${name}.${index}.year`, {
                valueAsNumber: true,
              })}
              label="Year"
            ></NumberInput>
          </div>
          <div className="col-span-3">
            <NumberInput
              {...register(`${name}.${index}.area`, {
                valueAsNumber: true,
              })}
              label="Area"
            ></NumberInput>
          </div>
          <div className="col-span-3">
            <NumberInput
              {...register(`${name}.${index}.pricePerSqMeterBeforeDepreciation`, {
                valueAsNumber: true,
              })}
              label="Price Per Sq. Meter"
            ></NumberInput>
          </div>
        </div>
        <div className="h-[300px]">
          <BuildingDetailTable
            headers={propertiesTableHeader}
            name={`${name}.${index}.buildingDepreciations`}
          />
        </div>
        <form method="dialog">
          {/* if there is a button in form, it will close the modal */}
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
      </div>
    </dialog>
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
    footer: (values: any) => {
      console.log(values);
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
    footer: (values: any) => {
      console.log(values);
      return (
        <span>
          Total:{' '}
          {Number(values.reduce((prev: number, curr: number) => prev + curr, 0)).toLocaleString()}
        </span>
      );
    },
    // footerSum: true,
  },
];

export default BuildingDetailPopUpModal;
