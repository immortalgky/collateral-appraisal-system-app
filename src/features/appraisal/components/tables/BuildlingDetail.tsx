import { useState } from 'react';
import BuildingDetailPopUpModal from './BuildingDetailPopUpModal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import BuildingDetailTable, {
  toNumber,
  type FormTableHeader,
} from '../BuildingTable/BuildingDetailTable';
import { useWatch } from 'react-hook-form';

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

  const buildingDetailArr = useWatch({ name });

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
          buildingDepre: `${name}`,
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

const propertiesTableHeader: FormTableHeader[] = [
  {
    type: 'row-number',
    rowNumberColumn: true,
    headerName: 'Seq',
    className: 'w-[70px] border-r-1 border-neutral-3',
  },
  {
    type: 'derived',
    headerName: 'Detail',
    name: 'areaDescription',
    className: 'w-[200px]  border-r-1 border-neutral-3',
  },
  {
    type: 'derived',
    name: 'isBuilding',
    headerName: 'IsBuilding',
    className: 'w-[100px]  border-r-1 border-neutral-3',
    modifier: (value: string) => (value ? 'Yes' : 'No'),
  },
  {
    type: 'derived',
    name: 'area',
    headerName: 'Area',
    className: 'w-[200px]  border-r-1 border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'group',
    groupName: 'replacementCost',
    headerName: 'Replacement Cost New',
    className: 'w-[400px] border-b-1 border-r-1 border-neutral-3',
    align: 'center',
  },
  {
    type: 'derived',
    groupName: 'replacementCost',
    name: 'pricePerSqMeterBeforeDepreciation',
    headerName: 'Price per sq.M',
    className: 'w-[200px]  border-r-1 border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'derived',
    groupName: 'replacementCost',
    name: 'totalPriceBeforeDepreciation',
    headerName: 'Total Price',
    className: 'w-[200px]  border-r-1 border-neutral-3',
    align: 'right',

    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const area = row['area'];
      const pricePerSqm = row['pricePerSqMeterBeforeDepreciation'];
      return area * pricePerSqm;
    },
  },
  {
    type: 'derived',
    name: 'year',
    headerName: 'Age (Year)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
  },
  {
    type: 'group',
    groupName: 'depreciation',
    headerName: 'Depreciation',
    className: 'w-[1000px] border-b-1 border-r-1 border-neutral-3',
    align: 'center',
  },
  {
    type: 'derived',
    groupName: 'depreciation',
    name: 'totalDepreciationPercentPerYear',
    headerName: 'Depreciation (%/year)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',

    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.buildingDepreciationMethods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const totalDepreciationPercent = buildingDepreciations
        .map(b => b.depreciationPercentPerYear)
        .reduce((acc, curr) => acc + toNum(curr), 0);

      return totalDepreciationPercent / buildingDepreciations.length;
    },
  },
  {
    type: 'derived',
    headerName: 'Total Depreciation (%)',
    groupName: 'depreciation',
    name: 'totalDepreciationPercent',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',

    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.buildingDepreciationMethods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const totalBuildingDepreciation = buildingDepreciations
        .map(b => b.totalDepreciationPercent)
        .reduce((acc, curr) => acc + toNum(curr), 0);

      return totalBuildingDepreciation / buildingDepreciations.length;
    },
  },
  {
    type: 'derived',
    groupName: 'depreciation',
    name: 'depreciationMethod',
    headerName: 'Method',
    className: 'w-[200px] border-r-1 border-neutral-3',
    modifier: (value: string) => (value ? 'Period' : 'Gross'),
  },
  {
    type: 'derived',
    groupName: 'depreciation',
    name: 'totalDepreciationPrice',
    headerName: 'Total Depreciation (Bath)',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.buildingDepreciationMethods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const totalDepreciationPrice = buildingDepreciations
        .map(b => b.depreciationPrice)
        .reduce((acc, curr) => acc + toNum(curr), 0);
      return totalDepreciationPrice;
    },
  },
  {
    type: 'group',
    groupName: 'priceAfterDepreciation',
    headerName: 'Replacement Cost After Depreciation',
    className: 'w-[400px] border-b-1 border-neutral-3',
    align: 'center',
  },
  {
    type: 'derived',
    groupName: 'priceAfterDepreciation',
    name: 'pricePerSqMeterAfterDepreciation',
    headerName: 'Price per sq.M after depreciation',
    className: 'w-[200px] border-r-1 border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const totalPriceAfterDepreciation = row['totalPriceAfterDepreciation'];
      const area = row['area'];

      if (area === 0) return 0;
      return totalPriceAfterDepreciation / area;
    },
    footer: (values: any) => {
      const areaArr = values.map(v => toNumber(v['area']));
      const totalPriceAfterDepreciationArr = values.map(v =>
        toNumber(v['totalPriceAfterDepreciation']),
      );

      if (!Array.isArray(areaArr) && !Array.isArray(totalPriceAfterDepreciationArr)) return 0;
      if (areaArr.length === 0 && totalPriceAfterDepreciationArr.length === 0) return 0;

      const totalArea = areaArr.reduce((prev: number, curr: number) => prev + curr, 0);
      const totalPriceAfterDepreciation = totalPriceAfterDepreciationArr.reduce(
        (prev: number, curr: number) => prev + curr,
        0,
      );

      return <span>Average: {(totalPriceAfterDepreciation / totalArea).toLocaleString()}</span>;
    },
  },
  {
    type: 'derived',
    groupName: 'priceAfterDepreciation',
    name: 'totalPriceAfterDepreciation',
    headerName: 'Total Price After Depreciation',
    className: 'w-[200px]',
    align: 'right',

    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const totalPriceBeforeDepreciation = row['totalPriceBeforeDepreciation'];
      const totalDepreciationPrice = row['totalDepreciationPrice'];
      return totalPriceBeforeDepreciation - totalDepreciationPrice;
    },
    footer: (values: any) => {
      const totalPriceAfterDepreciationArr = values.map(v =>
        toNumber(v['totalPriceAfterDepreciation']),
      );

      if (!Array.isArray(totalPriceAfterDepreciationArr)) return 0;
      if (totalPriceAfterDepreciationArr.length === 0) return 0;

      const total = totalPriceAfterDepreciationArr.reduce(
        (prev: number, curr: number) => prev + curr,
        0,
      );

      return <span>Total: {total.toLocaleString()}</span>;
    },
  },
];
