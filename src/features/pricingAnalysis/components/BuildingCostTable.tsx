import clsx from 'clsx';
import { Fragment, useState } from 'react';
import { Icon } from '@/shared/components';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { toNumber } from '../../appraisal/components/BuildingTable/BuildingDetailTable';
import type { FormTableHeader } from '../../appraisal/components/BuildingTable/BuildingDetailTable';
import BuildingDetailPopUpModal from '../../appraisal/components/tables/BuildingDetailPopUpModal';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

export interface BuildingCostItem {
  propertyName?: string;
  propertyType?: string;
  depreciationDetails?: any[];
  [key: string]: unknown;
}

interface BuildingCostTableProps {
  buildingCost: BuildingCostItem[];
  onChange?: (updated: BuildingCostItem[]) => void;
}

const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

type Align = 'left' | 'right' | 'center';
const alignClass = (align?: Align) => {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
};

function computeDerivedValues(rows: any[], rowIndex: number, allRows: any[]): Record<string, any> {
  const row = { ...rows[rowIndex] };
  const outScopeFields = { buildingDepre: allRows };
  const getValues = () => undefined;

  for (let pass = 0; pass < 2; pass++) {
    for (const header of propertiesTableHeader) {
      if ('compute' in header && 'name' in header && (header as any).compute) {
        const result = (header as any).compute({ rows, row, rowIndex, getValues, outScopeFields });
        row[(header as any).name] = Number.isFinite(result) ? result : 0;
      }
    }
  }

  return row;
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
    compute: ({ row }) => toNum(row['area']) * toNum(row['pricePerSqMBeforeDepreciation']),
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
      const periods: any[] = outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];
      if (!periods.length) return 0;
      const totalYears = periods.reduce(
        (acc: number, b: any) => acc + Math.max(toNum(b.toYear) - toNum(b.atYear) + 1, 0),
        0,
      );
      if (!totalYears) return 0;
      return (
        periods.reduce((acc: number, b: any) => {
          const span = Math.max(toNum(b.toYear) - toNum(b.atYear) + 1, 0);
          return acc + toNum(b.depreciationPerYear) * span;
        }, 0) / totalYears
      );
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
      const periods: any[] = outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];
      return periods.reduce((acc: number, b: any) => acc + toNum(b.totalDepreciationPct), 0);
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
          className={clsx(
            'inline-flex items-center justify-center text-[10px] font-medium px-1.5 py-0.5 rounded-full',
            isGross ? 'bg-success-100 text-success-700' : 'bg-primary-100 text-primary-700',
          )}
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
      const periods: any[] = outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];
      return periods.reduce((acc: number, b: any) => acc + toNum(b.priceDepreciation), 0);
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
    compute: ({ row }) => toNum(row['priceBeforeDepreciation']) - toNum(row['priceDepreciation']),
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
      const area = toNum(row['area']);
      return area === 0 ? 0 : toNum(row['priceAfterDepreciation']) / area;
    },
    footer: ({ rows }: { rows: any[] }) => {
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const totalArea = rows.reduce((acc, row) => acc + toNumber(row['area']), 0);
      const totalAfter = rows.reduce(
        (acc, row) => acc + toNumber(row['priceAfterDepreciation']),
        0,
      );
      if (totalArea === 0) return null;
      return (
        <span className="font-medium text-gray-600 text-xs">
          {Math.round(totalAfter / totalArea).toLocaleString()}
        </span>
      );
    },
    tooltip: 'Price/sq.m. after depreciation',
    isComputed: true,
  },
];

const hasGroups = propertiesTableHeader.some(h => h.type === 'group');
const visibleHeaders = propertiesTableHeader.filter(h => h.type !== 'group');
const subHeaders = propertiesTableHeader.filter(
  h => 'groupName' in h && h.type !== 'group',
) as FormTableHeader[];

const ROW_GROUPING = {
  field: 'isBuilding',
  groups: [
    {
      value: true,
      label: 'Building',
      className: 'bg-primary-50',
      subtotalClassName: 'bg-primary-50/50',
    },
    {
      value: false,
      label: 'Non-Building',
      className: 'bg-amber-50',
      subtotalClassName: 'bg-amber-50/50',
    },
  ],
} as const;

function ReadOnlyTableHeader({ header, index }: { header: FormTableHeader; index: number }) {
  const thBase = 'text-white text-xs font-medium py-1.5 px-2 truncate sticky top-0 z-20 bg-primary';

  if (header.type === 'group') {
    const colSpan = propertiesTableHeader.filter(
      h =>
        'groupName' in h &&
        h.type !== 'group' &&
        (h as any).groupName === (header as any).groupName,
    ).length;
    return (
      <th
        key={index}
        className={clsx(thBase, header.className, alignClass(header.align))}
        colSpan={colSpan}
        title={header.tooltip}
      >
        {header.headerName}
      </th>
    );
  }

  if ('groupName' in header) return null;

  return (
    <th
      key={index}
      className={clsx(thBase, header.className, alignClass(header.align))}
      rowSpan={hasGroups ? 3 : 1}
      title={header.tooltip}
    >
      {header.headerName}
    </th>
  );
}

function ReadOnlyCell({
  header,
  row,
  rowIndex,
  displayRowNumber,
}: {
  header: FormTableHeader;
  row: any;
  rowIndex: number;
  displayRowNumber?: number;
}) {
  if (header.type === 'group') return null;

  const h = header as any;
  const tdClass = clsx(
    'py-1.5 px-2 border-b border-neutral-3 whitespace-nowrap truncate text-xs',
    alignClass(header.align),
    header.className,
  );

  if (header.type === 'row-number') {
    return <td className={tdClass}>{displayRowNumber ?? rowIndex + 1}</td>;
  }

  const rawValue = row[h.name];
  const displayValue = h.modifier ? h.modifier(rawValue) : rawValue;

  if (h.render) {
    return <td className={tdClass}>{h.render({ value: rawValue, row, rowIndex })}</td>;
  }

  return (
    <td className={tdClass}>
      <span className="truncate text-gray-600">
        {displayValue != null && displayValue !== '' && displayValue !== 0 ? displayValue : 0}
      </span>
    </td>
  );
}

function SubtotalRow({
  rows,
  subtotalClassName,
  hasActionCol,
}: {
  rows: any[];
  subtotalClassName?: string;
  hasActionCol: boolean;
}) {
  return (
    <tr className={clsx('border-t border-neutral-3', subtotalClassName)}>
      {visibleHeaders.map((header, colIdx) => {
        const h = header as any;
        const footerFn = h.footer;
        const tdClass = clsx('py-1.5 px-2 border-b border-neutral-3', alignClass(header.align));

        if (!footerFn) return <td key={colIdx} className={tdClass} />;

        let content: React.ReactNode;
        switch (header.type) {
          case 'derived':
            content = footerFn({ rows });
            break;
          case 'input-number':
            content = footerFn(rows);
            break;
          case 'input-text':
          case 'display':
            content = footerFn(rows.map((v: any) => v[h.name]));
            break;
          default:
            content = '';
        }

        return (
          <td key={colIdx} className={tdClass}>
            <span className="inline-flex items-center justify-center text-xs font-medium">
              {content}
            </span>
          </td>
        );
      })}
      {/* action column spacer */}
      {hasActionCol && <td className="py-1.5 px-2 border-b border-neutral-3" />}
    </tr>
  );
}

function FooterRow({
  allRows,
  leadingEmptyCells,
  hasActionCol,
}: {
  allRows: any[];
  leadingEmptyCells: number;
  hasActionCol: boolean;
}) {
  return (
    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
      <tr>
        {Array.from({ length: leadingEmptyCells }).map((_, i) => (
          <td key={`lead-${i}`} className="py-1.5 px-2 sticky bottom-0 bg-gray-50" />
        ))}
        {visibleHeaders.map((header, inner_index) => {
          const h = header as any;
          const footer = h.footer;
          const tdClass = clsx('py-1.5 px-2 sticky bottom-0', alignClass(header.align));

          switch (header.type) {
            case 'derived':
              return (
                <td key={inner_index} className={tdClass}>
                  <span className="inline-flex items-center justify-center text-xs font-medium">
                    {footer ? footer({ rows: allRows }) : ''}
                  </span>
                </td>
              );
            case 'input-number':
              return (
                <td key={inner_index} className={tdClass}>
                  <span className="inline-flex items-center justify-center text-xs font-normal text-gray-400">
                    {footer ? footer(allRows) : ''}
                  </span>
                </td>
              );
            case 'input-text':
              return (
                <td key={inner_index} className={tdClass}>
                  <span className="inline-flex items-center justify-center text-xs font-normal text-gray-400">
                    {footer ? footer(allRows.map((v: any) => v[h.name])) : ''}
                  </span>
                </td>
              );
            case 'group':
              return null;
            default:
              return (
                <td key={inner_index} className="py-1.5 px-2 sticky bottom-0 right-0 bg-gray-50" />
              );
          }
        })}
        {hasActionCol && <td className="py-1.5 px-2 sticky bottom-0 right-0 bg-gray-50" />}
      </tr>
    </tfoot>
  );
}

export function BuildingCostTable({ buildingCost, onChange }: BuildingCostTableProps) {
  const isReadOnly = usePageReadOnly();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [activeBuildingIdx, setActiveBuildingIdx] = useState<number>(0);
  const [activeRowIdx, setActiveRowIdx] = useState<number | undefined>(undefined);

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    bIdx: number;
    rowIdx: number;
  } | null>(null);

  if (!buildingCost?.length) return null;

  const canEdit = !isReadOnly && !!onChange;

  const updateDepreciationDetails = (bIdx: number, newDetails: any[]) => {
    if (!onChange) return;
    const updated = buildingCost.map((b, i) =>
      i === bIdx ? { ...b, depreciationDetails: newDetails } : b,
    );
    onChange(updated);
  };

  const handleRequestAdd = (bIdx: number) => {
    setActiveBuildingIdx(bIdx);
    setActiveRowIdx(undefined);
    setModalMode('add');
    setModalOpen(true);
  };

  const handleRequestEdit = (bIdx: number, rowIdx: number) => {
    setActiveBuildingIdx(bIdx);
    setActiveRowIdx(rowIdx);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleModalSave = (data: any) => {
    const currentDetails = buildingCost[activeBuildingIdx]?.depreciationDetails ?? [];
    if (modalMode === 'add') {
      updateDepreciationDetails(activeBuildingIdx, [...currentDetails, data]);
    } else if (modalMode === 'edit' && activeRowIdx !== undefined) {
      const updated = currentDetails.map((r: any, i: number) => (i === activeRowIdx ? data : r));
      updateDepreciationDetails(activeBuildingIdx, updated);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setActiveRowIdx(undefined);
  };

  const handleRequestDelete = (bIdx: number, rowIdx: number) => {
    setDeleteConfirm({ bIdx, rowIdx });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    const { bIdx, rowIdx } = deleteConfirm;
    const currentDetails = buildingCost[bIdx]?.depreciationDetails ?? [];
    updateDepreciationDetails(
      bIdx,
      currentDetails.filter((_: any, i: number) => i !== rowIdx),
    );
    setDeleteConfirm(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const buildings = buildingCost.map((building, bIdx) => {
    const rawRows: any[] = building.depreciationDetails ?? [];
    const computedRows = rawRows.map((_, rIdx) => computeDerivedValues(rawRows, rIdx, rawRows));
    return { building, bIdx, rawRows, computedRows };
  });

  const allComputedRows = buildings.flatMap(b => b.computedRows);
  const isEmpty = allComputedRows.length === 0 && !canEdit;

  const visibleColCount = visibleHeaders.length + (canEdit ? 2 : 1); // +1 Sq.no, +1 actions

  // The active row's raw data for the modal
  const activeRawRow =
    activeRowIdx !== undefined
      ? ((buildingCost[activeBuildingIdx]?.depreciationDetails ?? [])[activeRowIdx] ?? null)
      : null;

  return (
    <>
      <div className="w-full max-h-full flex flex-col rounded-lg border border-neutral-3 overflow-clip">
        <div className="w-full h-full overflow-auto">
          <table className="!table-auto w-full h-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr className="bg-primary-700">
                <th
                  className="text-white text-xs font-medium py-1.5 px-2 truncate sticky top-0 z-20 bg-primary w-[32px] border-r border-neutral-3"
                  rowSpan={hasGroups ? 4 : 1}
                >
                  Sq.no
                </th>
                {propertiesTableHeader.map((header, index) => (
                  <ReadOnlyTableHeader key={index} header={header} index={index} />
                ))}
                {canEdit && (
                  <th
                    className="text-white text-xs font-medium py-1.5 px-2 text-center w-16 bg-primary sticky top-0 right-0 z-21 border-l border-neutral-3"
                    rowSpan={hasGroups ? 3 : 1}
                  />
                )}
              </tr>

              {hasGroups && (
                <tr className="bg-primary-700">
                  {subHeaders.map((header, index) => (
                    <th
                      key={index}
                      className={clsx(
                        'text-white text-xs font-medium py-1.5 px-2 truncate bg-primary sticky top-0 z-20',
                        header.className,
                        alignClass(header.align),
                      )}
                      title={header.tooltip}
                    >
                      {header.headerName}
                    </th>
                  ))}
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-neutral-3">
              {!isEmpty &&
                buildings.map(({ bIdx, computedRows }) => {
                  if (computedRows.length === 0 && !canEdit) return null;

                  const firstGroupWithRows = ROW_GROUPING.groups.find(g =>
                    computedRows.some(r => r[ROW_GROUPING.field] === g.value),
                  );
                  const totalDataRows = computedRows.length;
                  let bldgCellRendered = false;

                  const groupsWithData = ROW_GROUPING.groups.filter(g =>
                    computedRows.some(r => r[ROW_GROUPING.field] === g.value),
                  );
                  const bldgCellRowSpan =
                    groupsWithData.length * 2 + // group-label row + subtotal row per group
                    totalDataRows +
                    (canEdit ? 1 : 0); // "Add row" row

                  return (
                    <Fragment key={bIdx}>
                      {ROW_GROUPING.groups.map(group => {
                        const groupIndices: number[] = [];
                        computedRows.forEach((row, i) => {
                          if (row[ROW_GROUPING.field] === group.value) groupIndices.push(i);
                        });
                        if (groupIndices.length === 0) return null;

                        const groupRows = groupIndices.map(i => computedRows[i]);
                        const isFirstGroup = group === firstGroupWithRows;
                        const shouldRenderBldgCell = isFirstGroup && !bldgCellRendered;
                        if (shouldRenderBldgCell) bldgCellRendered = true;

                        return (
                          <Fragment key={`${bIdx}-${String(group.value)}`}>
                            <tr className={clsx(group.className)}>
                              {shouldRenderBldgCell && (
                                <td
                                  rowSpan={bldgCellRowSpan}
                                  className="border-b border-r border-neutral-3 text-center align-middle px-1 bg-white"
                                >
                                  <div className="flex flex-col items-center gap-1 py-1">
                                    <div className="items-center justify-center text-xs font-bold text-primary shrink-0">
                                      {bIdx + 1}
                                    </div>
                                  </div>
                                </td>
                              )}
                              <td
                                colSpan={
                                  shouldRenderBldgCell ? visibleColCount - 1 : visibleColCount
                                }
                                className="py-1.5 px-3 text-xs font-semibold border-b border-neutral-3"
                              >
                                {group.label} ({groupIndices.length})
                              </td>
                            </tr>

                            {groupIndices.map((rowIdxInBuilding, seqInGroup) => {
                              const row = computedRows[rowIdxInBuilding];
                              return (
                                <tr
                                  key={`${bIdx}-${rowIdxInBuilding}`}
                                  className={clsx(
                                    'hover:bg-gray-50 transition-colors',
                                    canEdit && 'cursor-pointer',
                                  )}
                                  onClick={
                                    canEdit
                                      ? () => handleRequestEdit(bIdx, rowIdxInBuilding)
                                      : undefined
                                  }
                                >
                                  {propertiesTableHeader.map((header, colIdx) => {
                                    if (header.type === 'group') return null;
                                    return (
                                      <ReadOnlyCell
                                        key={colIdx}
                                        header={header}
                                        row={row}
                                        rowIndex={rowIdxInBuilding}
                                        displayRowNumber={seqInGroup + 1}
                                      />
                                    );
                                  })}
                                  {canEdit && (
                                    <td
                                      className="py-1 px-1.5 sticky right-0 z-10 bg-white border-neutral-3 border-l border-b"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <div className="flex gap-0.5 justify-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRequestEdit(bIdx, rowIdxInBuilding)}
                                          className="w-6 h-6 flex items-center justify-center rounded bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                                          title="Edit"
                                        >
                                          <Icon style="solid" name="pen" className="size-2.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRequestDelete(bIdx, rowIdxInBuilding)
                                          }
                                          className="w-6 h-6 flex items-center justify-center rounded bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                                          title="Delete"
                                        >
                                          <Icon style="solid" name="trash" className="size-2.5" />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}

                            <SubtotalRow
                              rows={groupRows}
                              subtotalClassName={group.subtotalClassName}
                              hasActionCol={canEdit}
                            />
                          </Fragment>
                        );
                      })}

                      {canEdit && (
                        <tr>
                          <td
                            colSpan={visibleColCount + 1}
                            className="p-2 border-b border-neutral-3 bg-gray-50"
                          >
                            <button
                              type="button"
                              onClick={() => handleRequestAdd(bIdx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors rounded"
                            >
                              <Icon style="solid" name="plus" className="size-3" />
                              Add row
                            </button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>

            {!isEmpty && allComputedRows.length > 0 && (
              <FooterRow allRows={allComputedRows} leadingEmptyCells={1} hasActionCol={canEdit} />
            )}
          </table>
        </div>

        {/* Empty State */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-6 px-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <Icon style="solid" name="building" className="size-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-0.5">No depreciation data</h3>
            <p className="text-xs text-gray-500 text-center max-w-sm">
              Add building details to calculate depreciation.
            </p>
          </div>
        )}
      </div>

      {/* Edit / Add BuildingDetailPopUpModal */}
      <BuildingDetailPopUpModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        initialData={activeRawRow}
        mode={modalMode}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Delete Row"
        message="Are you sure you want to delete this row? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirm(null)}
        variant="danger"
      />
    </>
  );
}
