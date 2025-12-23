import { useContext, useEffect, useRef, useState } from 'react';
import BuildingDetailPopUpModal from './BuildingDetailPopUpModal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import BuildingDetailTable from './BuildingDetailTable';
import { useController, useFieldArray, useFormContext } from 'react-hook-form';

interface BuildingDetailProps {
  name: string;
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function BuildingDetail({ name }: BuildingDetailProps) {
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

  return (
    <div>
      <BuildingDetailTable
        name={name}
        headers={propertiesTableHeader}
        getEditingStatus={handlePopupModal}
        defaultValue={{
          seq: 1,
          areaDescription: '',
          area: 0,
          isBuilding: false,
          pricePerSqMeterBeforeDepreciation: 0,
          totalPriceBeforeDepreciation: 0,
          year: 0,
          totalDepreciationPercent: 0,
          depreciationPercentPerYear: 0,
          depreciationMethod: 'Period',
          totalDepreciationPrice: 0,
          pricePerSqMeterAfterDepreciation: 0,
          totalPriceAfterDepreciation: 0,
          buildingDepreciationMethods: [],
        }}
        outScopeFields={{
          buildingDepre: `${name}.${editingIndex}.buildingDepreciationMethods`,
        }}
        disableSaveBtn={true}
      />
      {isOpen ? (
        <BuildingDetailPopUpModal
          name={`${name}`}
          index={editingIndex}
          onClose={handlePopupModal}
          outScopeFields={{
            area: `${name}.${editingIndex}.area`,
            pricePerSqm: `${name}.${editingIndex}.pricePerSqMeterBeforeDepreciation`,
          }}
        />
      ) : (
        <></>
      )}
    </div>
  );
}

const propertiesTableHeader = [
  { type: 'row-number', label: 'Seq', className: 'w-[70px] border-r-1 border-neutral-3' },
  {
    type: 'text',
    name: 'areaDescription',
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
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'group',
    groupName: 'replacementCost',
    label: 'Replacement Cost New',
    className: 'w-[400px] border-b-1 border-r-1 border-neutral-3',
    align: 'center',
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'text',
    groupName: 'replacementCost',
    name: 'pricePerSqMeterBeforeDepreciation',
    label: 'Price per sq.M',
    className: 'w-[200px]  border-r-1 border-neutral-3',
    align: 'right',
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'text',
    groupName: 'replacementCost',
    name: 'totalPriceBeforeDepreciation',
    label: 'Total Price',
    className: 'w-[200px]  border-r-1 border-neutral-3',
    align: 'right',

    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const area = row['area'];
      const pricePerSqm = row['pricePerSqMeterBeforeDepreciation'];
      return area * pricePerSqm;
    },
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
    name: 'totalDepreciationPercentPerYear',
    label: 'Depreciation (%/year)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',

    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ outScopeFields }) => {
      const buildingDepreciations = outScopeFields['buildingDepre'];

      if (!Array.isArray(buildingDepreciations)) return 0;

      if (buildingDepreciations.length === 0) return 0;

      const totalDepreciationPercent = buildingDepreciations
        .map(b => b.depreciationPercentPerYear)
        .reduce((acc, curr) => acc + toNum(curr), 0);

      return totalDepreciationPercent / buildingDepreciations.length;
    },
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'totalDepreciationPercent',
    label: 'Total Depreciation (%)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',

    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ outScopeFields }) => {
      const buildingDepreciations = outScopeFields['buildingDepre'];

      if (!Array.isArray(buildingDepreciations)) return 0;

      const totalBuildingDepreciation = buildingDepreciations
        .map(b => b.totalDepreciationPerYear)
        .reduce((acc, curr) => acc + toNum(curr), 0);
      return totalBuildingDepreciation;
    },
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'depreciationMethod',
    label: 'Method',
    className: 'w-[200px] border-r-1 border-neutral-3',
    body: (value: string) => (value ? 'Period' : 'Gross'),
  },
  {
    type: 'text',
    groupName: 'depreciation',
    name: 'totalDepreciationPrice',
    label: 'Total Depreciation (Bath)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ outScopeFields }) => {
      const buildingDepreciations = outScopeFields['buildingDepre'];

      if (!Array.isArray(buildingDepreciations)) return 0;

      const totalDepreciationPrice = buildingDepreciations
        .map(b => b.depreciationPrice)
        .reduce((acc, curr) => acc + toNum(curr), 0);
      return totalDepreciationPrice;
    },
  },
  {
    type: 'text',
    name: 'pricePerSqMeterAfterDepreciation',
    label: 'Price per sq.M after depreciation',
    className: 'w-[250px] border-r-1 border-neutral-3',
    align: 'right',
    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const totalPriceAfterDepreciation = row['totalPriceAfterDepreciation'];
      const area = row['area'];

      if (area === 0) return 0;
      return totalPriceAfterDepreciation / area;
    },
  },
  {
    type: 'text',
    name: 'totalPriceAfterDepreciation',
    label: 'Total Price After Depreciation',
    className: 'w-[230px]',
    footerSum: true,
    align: 'right',

    body: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const totalPriceBeforeDepreciation = row['totalPriceBeforeDepreciation'];
      const totalDepreciationPrice = row['totalDepreciationPrice'];
      return totalPriceBeforeDepreciation - totalDepreciationPrice;
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
