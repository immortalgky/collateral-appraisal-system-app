import { useEffect, useRef, useState } from 'react';
import BuildingDetailPopUpModal from './BuildingDetailPopUpModal';
import BuildingDetailTable from './BuildingDetailTable';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useFormContext, useWatch } from 'react-hook-form';

interface BuildingDetailProps {
  name: string;
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function BuildingDetail({ name }: BuildingDetailProps) {
  const { register, control, setValue, getValues } = useFormContext();

  const { isOpen, onClose, onOpen } = useDisclosure();
  const [editingIndex, setEditingIndex] = useState<number | undefined>();

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const handlePopupModal = (index: number | undefined) => {
    if (index != undefined) {
      setEditingIndex(index);
      onOpen();
    } else {
      setEditingIndex(undefined);
      onClose();
    }
  };

  const buildings = useWatch({ control, name });
  const building = editingIndex != null ? buildings[editingIndex] : undefined;

  const area = building?.area ?? undefined;
  const pricePerSqm = building?.pricePerSqMeterBeforeDepreciation ?? undefined;

  useEffect(() => {
    if (editingIndex == null) return;

    if (building == undefined) return;

    const baseTotal = toNum(area) * toNum(pricePerSqm);

    let sum = 0;
    let totalDeprePercent = 0;
    let totalDeprePerBuildling = 0;

    building.buildingDepreciations.forEach((row: any, rowIndex: number) => {
      const depre = toNum(row.depreciationPerYear);
      const year = toNum(row.toYear) - toNum(row.atYear);
      const totalDepre = (depre * year) / 100;
      const computedPriceAfter = baseTotal * totalDepre;

      const pricePath = `${name}.${editingIndex}.buildingDepreciations.${rowIndex}.priceAfterDepreciation`;
      const current = toNum(getValues(pricePath));

      sum += computedPriceAfter;
      totalDeprePercent += totalDepre;
      totalDeprePerBuildling += computedPriceAfter;

      // guard: only write when changed (prevents loops/spam)
      if (current !== computedPriceAfter) {
        setValue(
          `${name}.${editingIndex}.buildingDepreciations.${rowIndex}.totalDepreciationPerYear`,
          totalDepre * 100,
          {
            shouldDirty: true,
            shouldValidate: false,
          },
        );
        setValue(pricePath, computedPriceAfter, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
    });

    const totalPriceBeforeDepreciation = getValues(
      `${name}.${editingIndex}.totalPriceBeforeDepreciation`,
    );
    if (totalPriceBeforeDepreciation != baseTotal) {
      setValue(`${name}.${editingIndex}.totalPriceBeforeDepreciation`, baseTotal, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }

    const totalPriceAfterDepreciation = getValues(
      `${name}.${editingIndex}.totalPriceAfterDepreciation`,
    );

    if (totalPriceAfterDepreciation !== totalPriceBeforeDepreciation - sum) {
      setValue(
        `${name}.${editingIndex}.totalPriceAfterDepreciation`,
        toNum(totalPriceBeforeDepreciation) - sum,
      );

      setValue(`${name}.${editingIndex}.totalDepreciationPercent`, totalDeprePercent, {
        shouldDirty: true,
        shouldValidate: false,
      });

      setValue(`${name}.${editingIndex}.totalDepreciation`, totalDeprePerBuildling, {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [building, getValues, setValue]);

  return (
    <div>
      <BuildingDetailTable
        name="buildings"
        headers={propertiesTableHeader}
        handlePopupModal={handlePopupModal}
        defaultValue={{
          seq: 1,
          detail: '',
          isBuilding: false,
          area: 0,
          pricePerSqMeterBeforeDepreciation: 0,
          totalPriceBeforeDepreciation: 0,
          year: 0,
          depreciationPercentPerYear: 0,
          totalDepreciationPercent: 0,
          method: 'Period',
          totalDepreciation: 0,
          pricePerSqMeterAfterDepreciation: 0,
          totalPriceAfterDepreciation: 0,
          buildingDepreciations: [],
        }}
      />
      {isOpen ? <BuildingDetailPopUpModal name={name} index={editingIndex} open={onOpen} /> : <></>}
    </div>
  );
}

const propertiesTableHeader = [
  { type: 'text', name: 'seq', label: 'Seq', className: 'w-[60px]' },
  { type: 'text', name: 'detail', label: 'Detail', className: 'w-[200px]' },
  { type: 'text', name: 'isBuilding', label: 'IsBuilding', className: 'w-[100px]' },
  { type: 'text', name: 'area', label: 'Area', className: 'w-[200px]', align: 'right' },
  {
    type: 'text',
    name: 'pricePerSqMeterBeforeDepreciation',
    label: 'Price per sq.M',
    className: 'w-[200px]',
    align: 'right',
  },
  {
    type: 'text',
    name: 'totalPriceBeforeDepreciation',
    label: 'Total Price',
    className: 'w-[200px]',
    align: 'right',
  },
  { type: 'text', name: 'year', label: 'Age(Year)', className: 'w-[200px]', align: 'right' },
  {
    type: 'group',
    groupName: 'depreciation',
    label: 'Depreciation',
    className: 'w-[200px]',
    align: 'center',
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'depreciationPercentPerYear',
    label: 'Depreciation (%/year)',
    className: 'w-[200px]',
    align: 'right',
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'totalDepreciationPercent',
    label: 'Total Depreciation (%)',
    className: 'w-[200px]',
    align: 'right',
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'method',
    label: 'Method',
    className: 'w-[200px]',
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'totalDepreciation',
    label: 'Total Depreciation (Bath)',
    className: 'w-[200px]',
    align: 'right',
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'pricePerSqMeterAfterDepreciation',
    label: 'Price per sq.M after depreciation',
    className: 'w-[200px]',
    align: 'right',
  },
  {
    type: 'text',
    name: 'totalPriceAfterDepreciation',
    label: 'Total Price After Depreciation',
    className: 'w-[200px]',
    footerSum: true,
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
  },
];
