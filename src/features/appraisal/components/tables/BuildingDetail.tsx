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

  // Watch for form changes to trigger re-renders
  useWatch({ name });

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
          depreciationMethod: true, // true = "Period", false = "Gross"
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
    headerName: 'No.',
    className: 'w-[36px] border-r border-neutral-3',
    tooltip: 'Row number',
  },
  {
    type: 'derived',
    headerName: 'Detail',
    name: 'areaDescription',
    className: 'w-[120px] border-r border-neutral-3',
    tooltip: 'Building area description',
    footer: () => (
      <span className="font-semibold text-gray-700 text-xs">Total</span>
    ),
  },
  {
    type: 'derived',
    name: 'isBuilding',
    headerName: 'Bldg',
    className: 'w-[45px] border-r border-neutral-3',
    align: 'center',
    render: ({ value }) => (
      <span className={`inline-flex items-center justify-center text-xs font-medium px-1.5 py-0.5 rounded ${value ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    ),
    tooltip: 'Is Building (Yes/No)',
  },
  {
    type: 'derived',
    name: 'area',
    headerName: 'Area',
    className: 'w-[70px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    tooltip: 'Area (sq.m.)',
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const total = rows.reduce((acc, row) => acc + toNumber(row['area']), 0);
      return <span className="font-medium text-gray-700 text-xs">{total.toLocaleString()}</span>;
    },
  },
  {
    type: 'group',
    groupName: 'replacementCost',
    headerName: 'Replacement Cost Before Depreciation',
    className: 'border-b border-r border-neutral-3',
    align: 'center',
    tooltip: 'Cost to replace the building before depreciation',
  },
  {
    type: 'derived',
    groupName: 'replacementCost',
    name: 'pricePerSqMeterBeforeDepreciation',
    headerName: '฿/m²',
    className: 'w-[75px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    tooltip: 'Price per sq.m. before depreciation',
  },
  {
    type: 'derived',
    groupName: 'replacementCost',
    name: 'totalPriceBeforeDepreciation',
    headerName: 'Total Price',
    className: 'w-[100px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const area = row['area'];
      const pricePerSqm = row['pricePerSqMeterBeforeDepreciation'];
      return area * pricePerSqm;
    },
    tooltip: 'Area × Price/sq.m.',
    isComputed: true,
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const total = rows.reduce((acc, row) => acc + toNumber(row['totalPriceBeforeDepreciation']), 0);
      return <span className="font-semibold text-gray-700 text-xs">{total.toLocaleString()}</span>;
    },
  },
  {
    type: 'derived',
    name: 'year',
    headerName: 'Yr',
    className: 'w-[40px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    tooltip: 'Building age (years)',
  },
  {
    type: 'group',
    groupName: 'depreciation',
    headerName: 'Depreciation',
    className: 'border-b border-r border-neutral-3',
    align: 'center',
    tooltip: 'Depreciation calculations',
  },
  {
    type: 'derived',
    groupName: 'depreciation',
    name: 'totalDepreciationPercentPerYear',
    headerName: '%/yr',
    className: 'w-[50px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toFixed(1) : value),
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.buildingDepreciationMethods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const totalDepreciationPercent = buildingDepreciations
        .map(b => b.depreciationPercentPerYear)
        .reduce((acc, curr) => acc + toNum(curr), 0);

      return totalDepreciationPercent / buildingDepreciations.length;
    },
    tooltip: 'Avg depreciation rate/year',
    isComputed: true,
  },
  {
    type: 'derived',
    headerName: 'Tot%',
    groupName: 'depreciation',
    name: 'totalDepreciationPercent',
    className: 'w-[50px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toFixed(1) : value),
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.buildingDepreciationMethods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const totalBuildingDepreciation = buildingDepreciations
        .map(b => b.totalDepreciationPercent)
        .reduce((acc, curr) => acc + toNum(curr), 0);

      return totalBuildingDepreciation / buildingDepreciations.length;
    },
    tooltip: 'Total depreciation %',
    isComputed: true,
  },
  {
    type: 'derived',
    groupName: 'depreciation',
    name: 'depreciationMethod',
    headerName: 'T',
    className: 'w-[32px] border-r border-neutral-3',
    align: 'center',
    modifier: (value: string) => (value ? 'P' : 'G'),
    tooltip: 'Method: P=Period, G=Gross',
  },
  {
    type: 'derived',
    groupName: 'depreciation',
    name: 'totalDepreciationPrice',
    headerName: 'Total Price',
    className: 'w-[95px] border-r border-neutral-3',
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
    tooltip: 'Total depreciation (฿)',
    isComputed: true,
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const total = rows.reduce((acc, row) => acc + toNumber(row['totalDepreciationPrice']), 0);
      return <span className="font-semibold text-orange-600 text-xs">{total.toLocaleString()}</span>;
    },
  },
  {
    type: 'group',
    groupName: 'priceAfterDepreciation',
    headerName: 'Replacement Cost After Depreciation',
    className: 'border-b border-neutral-3',
    align: 'center',
    tooltip: 'Values after depreciation',
  },
  {
    type: 'derived',
    groupName: 'priceAfterDepreciation',
    name: 'totalPriceAfterDepreciation',
    headerName: 'Total Price',
    className: 'w-[110px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const totalPriceBeforeDepreciation = row['totalPriceBeforeDepreciation'];
      const totalDepreciationPrice = row['totalDepreciationPrice'];
      return totalPriceBeforeDepreciation - totalDepreciationPrice;
    },
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const total = rows.reduce((acc, row) => acc + toNumber(row['totalPriceAfterDepreciation']), 0);
      return (
        <span className="font-bold text-success-600 text-xs">
          {total.toLocaleString()}
        </span>
      );
    },
    tooltip: 'Total after depreciation',
    isComputed: true,
  },
  {
    type: 'derived',
    groupName: 'priceAfterDepreciation',
    name: 'pricePerSqMeterAfterDepreciation',
    headerName: 'Price/Sq.m.',
    className: 'w-[85px]',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const totalPriceAfterDepreciation = row['totalPriceAfterDepreciation'];
      const area = row['area'];

      if (area === 0) return 0;
      return totalPriceAfterDepreciation / area;
    },
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const totalArea = rows.reduce((acc, row) => acc + toNumber(row['area']), 0);
      const totalPriceAfter = rows.reduce((acc, row) => acc + toNumber(row['totalPriceAfterDepreciation']), 0);

      if (totalArea === 0) return null;

      return (
        <span className="font-medium text-gray-600 text-xs">
          {Math.round(totalPriceAfter / totalArea).toLocaleString()}
        </span>
      );
    },
    tooltip: 'Price/sq.m. after depreciation',
    isComputed: true,
  },
];
