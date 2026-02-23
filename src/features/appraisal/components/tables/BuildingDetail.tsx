import { useState } from 'react';
import BuildingDetailPopUpModal from './BuildingDetailPopUpModal';
import BuildingDetailTable, {
  type FormTableHeader,
  toNumber,
} from '../BuildingTable/BuildingDetailTable';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

interface BuildingDetailProps {
  name: string;
}

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function BuildingDetail({ name }: BuildingDetailProps) {
  const { control } = useFormContext();
  const { append, update } = useFieldArray({ control, name });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingIndex, setEditingIndex] = useState<number | undefined>();

  const values = useWatch({ name }) || [];

  const handleRequestAdd = () => {
    setModalMode('add');
    setEditingIndex(undefined);
    setModalOpen(true);
  };

  const handleEdit = (index: number | undefined) => {
    if (index !== undefined) {
      setModalMode('edit');
      setEditingIndex(index);
      setModalOpen(true);
    }
  };

  const handleModalSave = (data: any) => {
    if (modalMode === 'add') {
      append(data);
    } else if (modalMode === 'edit' && editingIndex !== undefined) {
      update(editingIndex, data);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingIndex(undefined);
  };

  return (
    <div>
      <BuildingDetailTable
        name={name}
        headers={propertiesTableHeader}
        getEditingStatus={handleEdit}
        onRequestAdd={handleRequestAdd}
        onRowClick={handleEdit}
        striped
        rowGrouping={{
          field: 'isBuilding',
          groups: [
            { value: true, label: 'Building', className: 'bg-primary-50', subtotalClassName: 'bg-primary-50/50' },
            { value: false, label: 'Non-Building', className: 'bg-amber-50', subtotalClassName: 'bg-amber-50/50' },
          ],
        }}
        defaultValue={{
          seq: 1,
          areaDescription: '',
          area: 0,
          isBuilding: true,
          pricePerSqMBeforeDepreciation: 0,
          priceBeforeDepreciation: 0,
          year: 0,
          totalDepreciationPct: 0,
          depreciationYearPct: 0,
          depreciationMethod: 'Gross',
          priceDepreciation: 0,
          pricePerSqMAfterDepreciation: 0,
          priceAfterDepreciation: 0,
          depreciationPeriods: [],
        }}
        outScopeFields={{
          buildingDepre: `${name}`,
        }}
        disableSaveBtn={true}
        tableClassName="!table-auto"
      />
      <BuildingDetailPopUpModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        initialData={
          modalMode === 'edit' && editingIndex !== undefined ? values[editingIndex] : null
        }
        mode={modalMode}
      />
    </div>
  );
}

const propertiesTableHeader: FormTableHeader[] = [
  {
    type: 'row-number',
    rowNumberColumn: true,
    headerName: '#',
    className: 'w-[32px] border-r border-neutral-3',
    align: 'center',
    tooltip: 'Row number',
  },
  {
    type: 'derived',
    headerName: 'Detail',
    name: 'areaDescription',
    className: 'w-full border-r border-neutral-3',
    tooltip: 'Building area description',
    footer: () => <span className="font-semibold text-gray-700 text-xs">Total</span>,
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
    headerName: 'RCN Before Depre.',
    className: 'border-b border-r border-neutral-3',
    align: 'center',
    tooltip: 'Replacement Cost Before Depreciation',
  },
  {
    type: 'derived',
    groupName: 'replacementCost',
    name: 'pricePerSqMBeforeDepreciation',
    headerName: '฿/m²',
    className: 'w-[80px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    tooltip: 'Price per sq.m. before depreciation',
  },
  {
    type: 'derived',
    groupName: 'replacementCost',
    name: 'priceBeforeDepreciation',
    headerName: 'Total Price',
    className: 'w-[105px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const area = row['area'];
      const pricePerSqm = row['pricePerSqMBeforeDepreciation'];
      return area * pricePerSqm;
    },
    tooltip: 'Area × Price/sq.m.',
    isComputed: true,
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const total = rows.reduce((acc, row) => acc + toNumber(row['priceBeforeDepreciation']), 0);
      return <span className="font-semibold text-gray-700 text-xs">{total.toLocaleString()}</span>;
    },
  },
  {
    type: 'derived',
    name: 'year',
    headerName: 'Yr',
    className: 'w-[36px] border-r border-neutral-3',
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
    className: 'w-[38px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toFixed(1) : value),
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const totalYears = buildingDepreciations.reduce((acc: number, b: any) => {
        const atYear = toNum(b.atYear);
        const toYear = toNum(b.toYear);
        return acc + Math.max(toYear - atYear + 1, 0);
      }, 0);

      if (totalYears === 0) return 0;

      const weightedSum = buildingDepreciations.reduce((acc: number, b: any) => {
        const atYear = toNum(b.atYear);
        const toYear = toNum(b.toYear);
        const yearSpan = Math.max(toYear - atYear + 1, 0);
        return acc + toNum(b.depreciationPerYear) * yearSpan;
      }, 0);

      return weightedSum / totalYears;
    },
    tooltip: 'Weighted avg depreciation rate/year',
    isComputed: true,
  },
  {
    type: 'derived',
    headerName: 'Tot%',
    groupName: 'depreciation',
    name: 'totalDepreciationPct',
    className: 'w-[38px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toFixed(1) : value),
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const totalDepreciation = buildingDepreciations.reduce((acc: number, b: any) => {
        return acc + toNum(b.totalDepreciationPct);
      }, 0);

      return totalDepreciation;
    },
    tooltip: 'Total depreciation %',
    isComputed: true,
  },
  {
    type: 'derived',
    groupName: 'depreciation',
    name: 'depreciationMethod',
    headerName: 'Method',
    className: 'w-[55px] border-r border-neutral-3',
    align: 'center',
    render: ({ value }) => {
      const isGross = value === 'Gross';
      return (
        <span
          className={`inline-flex items-center justify-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            isGross
              ? 'bg-success-100 text-success-700'
              : 'bg-primary-100 text-primary-700'
          }`}
        >
          {isGross ? 'Gross' : 'Period'}
        </span>
      );
    },
    tooltip: 'Method: Period or Gross',
  },
  {
    type: 'derived',
    groupName: 'depreciation',
    name: 'priceDepreciation',
    headerName: 'Total Price',
    className: 'w-[100px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ rowIndex, outScopeFields }) => {
      const buildingDepreciations =
        outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];

      if (!Array.isArray(buildingDepreciations) || buildingDepreciations.length === 0) return 0;

      const priceDepreciation = buildingDepreciations
        .map((b: any) => b.priceDepreciation)
        .reduce((acc: number, curr: any) => acc + toNum(curr), 0);
      return priceDepreciation;
    },
    tooltip: 'Total depreciation (฿)',
    isComputed: true,
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const total = rows.reduce((acc, row) => acc + toNumber(row['priceDepreciation']), 0);
      return (
        <span className="font-semibold text-orange-600 text-xs">{total.toLocaleString()}</span>
      );
    },
  },
  {
    type: 'group',
    groupName: 'priceAfterDepreciation',
    headerName: 'RCN After Depre.',
    className: 'border-b border-neutral-3',
    align: 'center',
    tooltip: 'Replacement Cost After Depreciation',
  },
  {
    type: 'derived',
    groupName: 'priceAfterDepreciation',
    name: 'priceAfterDepreciation',
    headerName: 'Total Price',
    className: 'w-[110px] border-r border-neutral-3',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const priceBeforeDepreciation = row['priceBeforeDepreciation'];
      const priceDepreciation = row['priceDepreciation'];
      return priceBeforeDepreciation - priceDepreciation;
    },
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const total = rows.reduce((acc, row) => acc + toNumber(row['priceAfterDepreciation']), 0);
      return <span className="font-bold text-success-600 text-xs">{total.toLocaleString()}</span>;
    },
    tooltip: 'Total after depreciation',
    isComputed: true,
  },
  {
    type: 'derived',
    groupName: 'priceAfterDepreciation',
    name: 'pricePerSqMAfterDepreciation',
    headerName: '฿/m²',
    className: 'w-[85px]',
    align: 'right',
    modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
    compute: ({ row }) => {
      const priceAfterDepreciation = row['priceAfterDepreciation'];
      const area = row['area'];

      if (area === 0) return 0;
      return priceAfterDepreciation / area;
    },
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const totalArea = rows.reduce((acc, row) => acc + toNumber(row['area']), 0);
      const totalPriceAfter = rows.reduce(
        (acc, row) => acc + toNumber(row['priceAfterDepreciation']),
        0,
      );

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
