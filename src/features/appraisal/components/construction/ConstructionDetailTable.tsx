import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { z } from 'zod';
import NumberInput from '@shared/components/inputs/NumberInput';
import Icon from '@shared/components/Icon';
import { formatNumber } from '@shared/utils/formatUtils';
import { schemas } from '@shared/schemas/v1';

type ConstructionWorkGroupDto = z.infer<typeof schemas.ConstructionWorkGroupDto>;

interface ComputedItem {
  _index: number;
  constructionWorkGroupId: string;
  constructionWorkItemId?: string | null;
  workItemName: string;
  proportionPct: number;
  constructionValue: number;
  previousProgressPct: number;
  currentProgressPct: number;
  currentProportionPct: number;
  previousPropertyValue: number;
  currentPropertyValue: number;
}

interface CategorySubtotal {
  constructionWorkGroupId: string;
  totalConstructionValue: number;
  totalProportion: number;
  averagePreviousProgress: number;
  averageCurrentProgress: number;
  totalPreviousPropertyValue: number;
  totalCurrentPropertyValue: number;
}

interface ConstructionDetailTableProps {
  totalValue: number;
  workGroups: ConstructionWorkGroupDto[];
  computedSubItems: ComputedItem[];
  categorySubtotals: CategorySubtotal[];
  grandTotal: {
    totalConstructionValue: number;
    totalProportion: number;
    totalPreviousPropertyValue: number;
    totalCurrentPropertyValue: number;
  };
  onAddSubItem: (constructionWorkGroupId: string, constructionWorkItemId: string, workItemName: string) => void;
  onUpdateSubItem: (index: number, field: string, value: number) => void;
  onDeleteSubItem: (index: number) => void;
  readOnly?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  BuildingStructure: 'cubes',
  Architecture: 'layer-group',
  BuildingManagement: 'gears',
};

function AddSubItemDropdown({
  group,
  existingItemIds,
  onAdd,
}: {
  group: ConstructionWorkGroupDto;
  existingItemIds: string[];
  onAdd: (constructionWorkGroupId: string, constructionWorkItemId: string, workItemName: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const availableItems = group.items.filter(
    item => !existingItemIds.includes(item.id),
  );

  if (availableItems.length === 0) return null;

  const rect = btnRef.current?.getBoundingClientRect();

  // Check if dropdown would overflow below the viewport
  const getPosition = () => {
    if (!rect) return { top: 0, left: 0 };
    const menuHeight = menuRef.current?.offsetHeight ?? 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < menuHeight + 8) {
      // Open upward
      return { top: rect.top - menuHeight - 4, left: rect.left };
    }
    return { top: rect.bottom + 4, left: rect.left };
  };

  return (
    <div className="inline-block">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
      >
        <Icon name="plus" style="solid" className="size-2.5" />
        Add
      </button>
      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[200px]"
            style={getPosition()}
          >
            <div className="px-3 pb-1.5 mb-1 border-b border-gray-100">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Select Item</span>
            </div>
            {availableItems.map(item => (
              <button
                key={item.id}
                type="button"
                className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 text-gray-700 transition-colors"
                onClick={() => {
                  onAdd(group.id, item.id, item.nameEn);
                  setIsOpen(false);
                }}
              >
                <Icon name="plus" style="solid" className="size-2.5 text-gray-400" />
                {item.nameEn}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

export function ConstructionDetailTable({
  workGroups,
  computedSubItems,
  categorySubtotals,
  grandTotal,
  onAddSubItem,
  onUpdateSubItem,
  onDeleteSubItem,
  readOnly,
}: ConstructionDetailTableProps) {
  const isOverLimit = grandTotal.totalProportion > 100;

  return (
    <div className="space-y-2">
      {isOverLimit && (
        <div className="flex items-center gap-2 px-3 py-2 bg-danger/5 border border-danger/20 rounded-lg text-xs text-danger font-medium">
          <Icon name="triangle-exclamation" style="solid" className="size-3.5 flex-shrink-0" />
          Total proportion is {formatNumber(grandTotal.totalProportion, 2)}% — exceeds 100%
        </div>
      )}
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-primary text-white">
            <th className="text-left px-3 py-2.5 font-semibold min-w-[170px] sticky left-0 bg-primary">
              Construction Work
            </th>
            <th className="text-right px-3 py-2.5 font-semibold min-w-[125px]">
              <div>Construction Value</div>
              <div className="text-[10px] font-normal opacity-80">(Baht)</div>
            </th>
            <th className="text-right px-3 py-2.5 font-semibold min-w-[95px]">
              <div>Proportion</div>
              <div className="text-[10px] font-normal opacity-80">(%)</div>
            </th>
            <th className="text-right px-3 py-2.5 font-semibold min-w-[100px] bg-white/5">
              <div>Prev. Progress</div>
              <div className="text-[10px] font-normal opacity-80">(%)</div>
            </th>
            <th className="text-right px-3 py-2.5 font-semibold min-w-[110px]">
              <div>Curr. Progress</div>
              <div className="text-[10px] font-normal opacity-80">(%)</div>
            </th>
            <th className="text-right px-3 py-2.5 font-semibold min-w-[100px]">
              <div>Curr. Proportion</div>
              <div className="text-[10px] font-normal opacity-80">(%)</div>
            </th>
            <th className="text-right px-3 py-2.5 font-semibold min-w-[125px] bg-white/5">
              <div>Prev. Value</div>
              <div className="text-[10px] font-normal opacity-80">(Baht)</div>
            </th>
            <th className="text-right px-3 py-2.5 font-semibold min-w-[125px]">
              <div>Curr. Value</div>
              <div className="text-[10px] font-normal opacity-80">(Baht)</div>
            </th>
            {!readOnly && <th className="w-9 px-1 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {workGroups.map(group => {
            const items = computedSubItems.filter(
              item => item.constructionWorkGroupId === group.id,
            );
            const subtotal = categorySubtotals.find(
              s => s.constructionWorkGroupId === group.id,
            );
            const existingItemIds = items
              .map(i => i.constructionWorkItemId)
              .filter(Boolean) as string[];

            return (
              <CategorySection
                key={group.id}
                group={group}
                items={items}
                subtotal={subtotal}
                existingItemIds={existingItemIds}
                onAddSubItem={onAddSubItem}
                onUpdateSubItem={onUpdateSubItem}
                onDeleteSubItem={onDeleteSubItem}
                readOnly={readOnly}
              />
            );
          })}

          {/* Grand Total Row */}
          <tr className="bg-primary text-white font-semibold text-xs">
            <td className="px-3 py-2.5 sticky left-0 bg-primary">
              <div className="flex items-center gap-2">
                <Icon name="calculator" style="solid" className="size-3.5 opacity-80" />
                Total Building Value
              </div>
            </td>
            <td className="text-right px-3 py-2.5 tabular-nums">
              {formatNumber(grandTotal.totalConstructionValue, 2)}
            </td>
            <td className={`text-right px-3 py-2.5 tabular-nums ${isOverLimit ? 'text-red-200' : ''}`}>
              {formatNumber(grandTotal.totalProportion, 2)}
              {isOverLimit && ' !'}
            </td>
            <td className="text-right px-3 py-2.5" />
            <td className="text-right px-3 py-2.5" />
            <td className="text-right px-3 py-2.5" />
            <td className="text-right px-3 py-2.5 tabular-nums">
              {formatNumber(grandTotal.totalPreviousPropertyValue, 2)}
            </td>
            <td className="text-right px-3 py-2.5 tabular-nums">
              {formatNumber(grandTotal.totalCurrentPropertyValue, 2)}
            </td>
            {!readOnly && <td className="px-1 py-2.5" />}
          </tr>
        </tbody>
      </table>
    </div>
    </div>
  );
}

function CategorySection({
  group,
  items,
  subtotal,
  existingItemIds,
  onAddSubItem,
  onUpdateSubItem,
  onDeleteSubItem,
  readOnly,
}: {
  group: ConstructionWorkGroupDto;
  items: ComputedItem[];
  subtotal?: CategorySubtotal;
  existingItemIds: string[];
  onAddSubItem: (constructionWorkGroupId: string, constructionWorkItemId: string, workItemName: string) => void;
  onUpdateSubItem: (index: number, field: string, value: number) => void;
  onDeleteSubItem: (index: number) => void;
  readOnly?: boolean;
}) {
  const icon = CATEGORY_ICONS[group.code] || 'folder';

  return (
    <>
      {/* Category Header */}
      <tr className="bg-gray-50/80 border-t border-gray-200">
        <td colSpan={readOnly ? 8 : 9} className="px-3 py-2">
          <div className="flex items-center gap-2">
            <Icon name={icon} style="solid" className="size-3 text-gray-500" />
            <span className="font-semibold text-xs text-gray-700">{group.nameEn}</span>
            {!readOnly && (
              <AddSubItemDropdown
                group={group}
                existingItemIds={existingItemIds}
                onAdd={onAddSubItem}
              />
            )}
            {items.length > 0 && (
              <span className="ml-auto text-[10px] text-gray-400 tabular-nums">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Sub-item Rows */}
      {items.map((item, idx) => (
        <tr
          key={item._index}
          className={`border-b border-gray-50 hover:bg-primary/[0.02] transition-colors ${
            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
          }`}
        >
          {/* Name — read-only */}
          <td className="text-right px-3 py-1.5 text-gray-600 font-medium sticky left-0 bg-inherit">
            {item.workItemName}
          </td>
          {/* Construction Value — auto-calculated from totalValue * proportionPct */}
          <td className="text-right px-3 py-1.5 text-gray-700 tabular-nums">
            {formatNumber(item.constructionValue, 2)}
          </td>
          {/* Proportion — EDITABLE */}
          <td className="px-1 py-0.5">
            <NumberInput
              value={item.proportionPct}
              onChange={e => onUpdateSubItem(item._index, 'proportionPct', e.target.value ?? 0)}
              decimalPlaces={2}
              max={100}
              disabled={readOnly}
              className="!py-1 !text-xs !rounded-md"
            />
          </td>
          {/* Previous Progress — read-only (from API) */}
          <td className="text-right px-3 py-1.5 text-gray-400 tabular-nums bg-gray-50/50">
            {formatNumber(item.previousProgressPct, 2)} %
          </td>
          {/* Current Progress — EDITABLE */}
          <td className="px-1 py-0.5">
            <NumberInput
              value={item.currentProgressPct}
              onChange={e => onUpdateSubItem(item._index, 'currentProgressPct', e.target.value ?? 0)}
              decimalPlaces={2}
              max={100}
              disabled={readOnly}
              className="!py-1 !text-xs !rounded-md"
            />
          </td>
          {/* Current Proportion — auto-calculated */}
          <td className="text-right px-3 py-1.5 text-gray-500 tabular-nums">
            {formatNumber(item.currentProportionPct, 2)}
          </td>
          {/* Previous Property Value — auto-calculated */}
          <td className="text-right px-3 py-1.5 text-gray-400 tabular-nums bg-gray-50/50">
            {formatNumber(item.previousPropertyValue, 2)}
          </td>
          {/* Current Property Value — auto-calculated */}
          <td className="text-right px-3 py-1.5 text-gray-800 font-medium tabular-nums">
            {formatNumber(item.currentPropertyValue, 2)}
          </td>
          {!readOnly && (
            <td className="px-1 py-1.5 text-center">
              <button
                type="button"
                onClick={() => onDeleteSubItem(item._index)}
                className="p-1 rounded-md text-gray-300 hover:text-danger hover:bg-danger/5 transition-all"
              >
                <Icon name="trash-can" style="regular" className="size-3" />
              </button>
            </td>
          )}
        </tr>
      ))}

      {/* Category Subtotal */}
      {subtotal && items.length > 0 && (
        <tr className="bg-primary-50 text-gray-700 text-xs font-semibold">
          <td className="px-3 py-2 sticky left-0 bg-primary-50">
            <span className="text-gray-500">Subtotal</span>
          </td>
          <td className="text-right px-3 py-2 tabular-nums">
            {formatNumber(subtotal.totalConstructionValue, 2)}
          </td>
          <td className="text-right px-3 py-2 tabular-nums">
            {formatNumber(subtotal.totalProportion, 2)}
          </td>
          <td className="text-right px-3 py-2 tabular-nums">
            {formatNumber(subtotal.averagePreviousProgress, 2)} %
          </td>
          <td className="text-right px-3 py-2 tabular-nums">
            {formatNumber(subtotal.averageCurrentProgress, 2)} %
          </td>
          <td className="text-right px-3 py-2" />
          <td className="text-right px-3 py-2 tabular-nums">
            {formatNumber(subtotal.totalPreviousPropertyValue, 2)}
          </td>
          <td className="text-right px-3 py-2 tabular-nums">
            {formatNumber(subtotal.totalCurrentPropertyValue, 2)}
          </td>
          {!readOnly && <td className="px-1 py-2" />}
        </tr>
      )}
    </>
  );
}
