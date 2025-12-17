import FormTable from '@/features/request/components/tables/FormTable';
import { NumberInput, TextInput } from '@/shared/components';
import { useEffect, useRef } from 'react';
import { useController, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import BuildingDetailTable from './BuildingDetailTable';

function BuildingDetailPopUpModal({ name, index, open }) {
  const { register } = useFormContext();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!dialogRef.current) return;
    open ? dialogRef.current.showModal() : dialogRef.current.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box w-11/12 max-w-5xl bg-white rounded-xl max-h-[600px]">
        <div className="inline-flex">
          <div>
            <TextInput {...register(`${name}.${index}.detail`)} label="Detail"></TextInput>
          </div>
          <div className="">
            <NumberInput
              {...register(`${name}.${index}.year`, {
                valueAsNumber: true,
              })}
              label="Year"
            ></NumberInput>
          </div>
          <div className="">
            <NumberInput
              {...register(`${name}.${index}.area`, {
                valueAsNumber: true,
              })}
              label="Area"
            ></NumberInput>
          </div>
          <div className="">
            <NumberInput
              {...register(`${name}.${index}.pricePerSqMeterBeforeDepreciation`, {
                valueAsNumber: true,
              })}
              label="Price Per Sq. Meter"
            ></NumberInput>
          </div>
        </div>
        <BuildingDetailTable
          headers={propertiesTableHeader}
          name={`${name}.${index}.buildingDepreciations`}
        />
        <form method="dialog">
          {/* if there is a button in form, it will close the modal */}
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
      </div>
    </dialog>
  );
}

const propertiesTableHeader = [
  { name: 'atYear', label: 'From Year', inputType: 'number' },
  { name: 'toYear', label: 'To Year', inputType: 'number' },
  { name: 'depreciationPerYear', label: 'Depreciation Per Year', inputType: 'number' },
  {
    name: 'totalDepreciationPerYear',
    label: 'Total Depreciation Per Year',
    align: 'right',
    footerSum: true,
  },
  {
    name: 'priceAfterDepreciation',
    label: 'Price After Depreciation',
    align: 'right',
    footerSum: true,
  },
];

export default BuildingDetailPopUpModal;
