import { useEffect, useRef, useState } from 'react';
import BuildingDetailPopUpModal from './BuildingDetailPopUpModal';
import BuildingDetailTable from './BuildingDetailTable';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

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

  const handlePopupModal = (index: number | undefined) => {
    if (index != undefined) {
      setEditingIndex(index);
      onOpen();
    } else {
      setEditingIndex(undefined);
      onClose();
    }
  };

  const fieldA: Record<string, any> = {
    buildingDepre: `${name}.${editingIndex}.buildingDepreciations`,
  };

  const fieldB: Record<string, any> = {
    area: `${name}.${editingIndex}.area`,
    pricePerSqm: `${name}.${editingIndex}.pricePerSqMeterBeforeDepreciation`,
  };

  return (
    <div>
      <BuildingDetailTable
        name={name}
        headers={propertiesTableHeader}
        getEditingStatus={handlePopupModal}
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
        outScopeFields={fieldA}
        disableSaveBtn={true}
      />
      {isOpen ? (
        <BuildingDetailPopUpModal
          name={name}
          index={editingIndex}
          onClose={handlePopupModal}
          outScopeFields={fieldB}
        />
      ) : (
        <></>
      )}
    </div>
  );
}

const propertiesTableHeader = [
  // { type: 'text', name: 'seq', label: 'Seq', className: 'w-[60px]' },
  { type: 'row-number', label: 'Seq', className: 'w-[70px] border-r-1 border-neutral-3' },
  {
    type: 'text',
    name: 'detail',
    label: 'Detail',
    className: 'w-[200px]  border-r-1 border-neutral-3',
  },
  {
    type: 'text',
    name: 'isBuilding',
    label: 'IsBuilding',
    className: 'w-[100px]  border-r-1 border-neutral-3',
    body: (value: string) => (value ? 'Yes' : 'No'),
  },
  {
    type: 'text',
    name: 'area',
    label: 'Area',
    className: 'w-[200px]  border-r-1 border-neutral-3',
    align: 'right',
  },
  {
    type: 'group',
    groupName: 'replacementCost',
    label: 'Replacement Cost New',
    className: 'w-[400px] border-b-1 border-r-1 border-neutral-3',
    align: 'center',
  },
  {
    type: 'text',
    groupName: 'replacementCost',
    name: 'pricePerSqMeterBeforeDepreciation',
    label: 'Price per sq.M',
    className: 'w-[200px]  border-r-1 border-neutral-3',
    align: 'right',
  },
  {
    type: 'text',
    groupName: 'replacementCost',
    name: 'totalPriceBeforeDepreciation',
    label: 'Total Price',
    className: 'w-[200px]  border-r-1 border-neutral-3',
    align: 'right',
  },
  {
    type: 'text',
    name: 'year',
    label: 'Age (Year)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'group',
    groupName: 'depreciation',
    label: 'Depreciation',
    className: 'w-[1000px] border-b-1 border-r-1 border-neutral-3',
    align: 'center',
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'depreciationPercentPerYear',
    label: 'Depreciation (%/year)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'totalDepreciationPercent',
    label: 'Total Depreciation (%)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',

    // compute: ({ outScopeFields }) => {
    //   const buildingDepreciations = outScopeFields['buildingDepre'];

    //   if (!Array.isArray(buildingDepreciations)) return 0;

    //   const totalBuildingDepreciation = buildingDepreciations
    //     .map(b => b.totalDepreciationPerYear)
    //     .reduce((acc, curr) => acc + toNum(curr), 0);
    //   return totalBuildingDepreciation;
    // },
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'method',
    label: 'Method',
    className: 'w-[200px] border-r-1 border-neutral-3',
    body: (value: string) => (value ? 'Period' : 'Gross'),
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'totalDepreciation',
    label: 'Total Depreciation (Bath)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'pricePerSqMeterAfterDepreciation',
    label: 'Price per sq.M after depreciation',
    className: 'w-[200px] w-[200px] border-r-1 border-neutral-3',
    align: 'right',
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
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
      return (
        <span>
          Total:{' '}
          {Number(values.reduce((prev: number, curr: number) => prev + curr, 0)).toLocaleString()}
        </span>
      );
    },
  },
];
