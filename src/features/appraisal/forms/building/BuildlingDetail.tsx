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
    if (isOpen) {
      setEditingIndex(undefined);
      onClose();
    } else {
      setEditingIndex(index);
      onOpen();
    }
  };

  const buildings = useWatch({ control, name });
  const building = editingIndex != null ? buildings[editingIndex] : undefined;

  const area = building?.area ?? undefined;
  const pricePerSqm = building?.pricePerSqMeterBeforeDepreciation ?? undefined;

  useEffect(() => {
    if (editingIndex == null) return;

    const baseTotal = toNum(area) * toNum(pricePerSqm);

    let sum = 0;

    building.buildingDepreciations.forEach((row: any, rowIndex: number) => {
      const depre = toNum(row.depreciationPerYear);
      const year = toNum(row.toYear) - toNum(row.atYear);
      const totalDepre = depre * year;
      const computedPriceAfter = baseTotal * totalDepre;

      const pricePath = `${name}.${editingIndex}.buildingDepreciations.${rowIndex}.priceAfterDepreciation`;
      const current = toNum(getValues(pricePath));

      sum += computedPriceAfter;

      // guard: only write when changed (prevents loops/spam)
      if (current !== computedPriceAfter) {
        setValue(
          `${name}.${editingIndex}.buildingDepreciations.${rowIndex}.totalDepreciationPerYear`,
          totalDepre,
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

    const totalPriceAfterDepreciation = getValues(
      `${name}.${editingIndex}.totalPriceAfterDepreciation`,
    );
    if (totalPriceAfterDepreciation != sum)
      setValue(`${name}.${editingIndex}.totalPriceAfterDepreciation`, sum);
  }, [building, getValues, setValue]);

  return (
    <div>
      <BuildingDetailTable
        name="buildings"
        headers={propertiesTableHeader}
        handlePopupModal={handlePopupModal}
      ></BuildingDetailTable>
      {isOpen ? <BuildingDetailPopUpModal name={name} index={editingIndex} open={onOpen} /> : <></>}
    </div>
  );
}

const propertiesTableHeader = [
  { name: 'seq', label: 'Seq', className: 'w-[200px]' },
  { name: 'detail', label: 'Detail', className: 'w-[200px]' },
  { name: 'isBuilding', label: 'IsBuilding', className: 'w-[200px]' },
  { name: 'area', label: 'Area', className: 'w-[200px]' },
  { name: 'pricePerSqMeterBeforeDepreciation', label: 'Price per sq.M', className: 'w-[200px]' },
  { name: 'totalPriceBeforeDepreciation', label: 'Total Price', className: 'w-[200px]' },
  { name: 'year', label: 'Age(Year)', className: 'w-[200px]' },
  { name: 'depreciationPercentPerYear', label: 'Depreciation (%/year)', className: 'w-[200px]' },
  { name: 'totalDepreciationPercent', label: 'Total Depreciation (%)', className: 'w-[200px]' },
  { name: 'method', label: 'Method', className: 'w-[200px]' },
  {
    name: 'pricePerSqMeterAfterDepreciation',
    label: 'Price per sq.M after depreciation',
    className: 'w-[200px]',
  },
  {
    name: 'totalPriceAfterDepreciation',
    label: 'Total Price After Depreciation',
    className: 'w-[200px]',
    footerSum: true,
  },
];
