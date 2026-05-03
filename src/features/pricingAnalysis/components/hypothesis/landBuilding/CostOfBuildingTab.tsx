/**
 * Cost of Building tab (Tab 2 of L&B) — FSD Figure 52.
 *
 * One section (card + table) per model name.  All row entry/editing goes
 * through HypothesisCostOfBuildingModal — the table itself is read-only.
 *
 * Each model section sub-groups rows into "Building" (isBuilding=true) and
 * "Non-Building" (isBuilding=false) visual subsections.  Two Add buttons in the
 * model header pre-set isBuilding accordingly.
 *
 * Column layout per-model table:
 *   # | Building Details | Area (Sq.M) | RCN Before Depre. (Price/m², Price Before Depre.)
 *     | Yr | Method pill | Depreciation (Total %, Depre. Baht) | RCN After Depre.
 *
 * Footer rows: per-subgroup subtotals + overall per-model B09/B10/B11
 */
import { useState } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Icon } from '@/shared/components';
import { fmt } from '../../../domain/formatters';
import type { LandBuildingFormValues } from '../../../schemas/hypothesisForm';
import type { LandBuildingModelAggregate } from '../../../types/hypothesis';
import {
  HypothesisCostOfBuildingModal,
  type CostBuildingRow,
} from './HypothesisCostOfBuildingModal';

// ─── Derived value helpers ────────────────────────────────────────────────────

const toN = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** B03 */
const computePriceBeforeDepre = (row: CostBuildingRow) =>
  toN(row.area) * toN(row.pricePerSqM);

/**
 * B06 — method-aware.
 * Gross:  min(100, year × annualDepreciationPercent)
 * Period: min(100, Σ (toYear − atYear + 1) × depreciationPerYear)
 */
const computeTotalDeprecPct = (row: CostBuildingRow): number => {
  if (row.depreciationMethod === 'Period' && Array.isArray(row.depreciationPeriods) && row.depreciationPeriods.length > 0) {
    const sum = row.depreciationPeriods.reduce((acc, p) => {
      const span = Math.max(toN(p.toYear) - toN(p.atYear) + 1, 0);
      return acc + span * toN(p.depreciationPerYear);
    }, 0);
    return Math.min(100, sum);
  }
  return Math.min(100, toN(row.year) * toN(row.annualDepreciationPercent));
};

/** B07 */
const computeDepreciationAmt = (row: CostBuildingRow) =>
  computePriceBeforeDepre(row) * computeTotalDeprecPct(row) / 100;

/** B08 */
const computeValueAfterDepre = (row: CostBuildingRow) =>
  computePriceBeforeDepre(row) - computeDepreciationAmt(row);

// ─── Number cell ──────────────────────────────────────────────────────────────

function NumCell({ value }: { value: number | null | undefined }) {
  if (value == null || !Number.isFinite(value)) return <span className="text-gray-300">—</span>;
  return (
    <span>{value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
  );
}

function IntCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-gray-300">—</span>;
  return <span>{value}</span>;
}

// ─── Method pill ──────────────────────────────────────────────────────────────

function MethodPill({ method }: { method?: string }) {
  const isGross = !method || method === 'Gross';
  return (
    <span
      className={`inline-flex items-center justify-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
        isGross ? 'bg-success-100 text-success-700' : 'bg-primary-100 text-primary-700'
      }`}
    >
      {isGross ? 'Gross' : 'Period'}
    </span>
  );
}

// ─── Subgroup rows within a model section ────────────────────────────────────

interface SubgroupProps {
  label: string;
  headerClassName: string;
  subtotalClassName: string;
  rowIndices: Array<{ row: CostBuildingRow; idx: number }>;
  liveValues: CostBuildingRow[];
  onEdit: (globalIdx: number) => void;
}

function SubgroupRows({
  label,
  headerClassName,
  subtotalClassName,
  rowIndices,
  liveValues,
  onEdit,
}: SubgroupProps) {
  if (rowIndices.length === 0) return null;

  const totalArea = rowIndices.reduce((acc, { idx }) => acc + toN(liveValues?.[idx]?.area), 0);
  const totalPriceBefore = rowIndices.reduce((acc, { idx }) => {
    const r = liveValues?.[idx];
    if (!r) return acc;
    return acc + (Number.isFinite(r.priceBeforeDepreciation) && r.priceBeforeDepreciation != null
      ? r.priceBeforeDepreciation
      : computePriceBeforeDepre(r));
  }, 0);
  const totalValueAfter = rowIndices.reduce((acc, { idx }) => {
    const r = liveValues?.[idx];
    if (!r) return acc;
    return acc + (Number.isFinite(r.valueAfterDepreciation) && r.valueAfterDepreciation != null
      ? r.valueAfterDepreciation
      : computeValueAfterDepre(r));
  }, 0);

  return (
    <>
      {/* Subgroup header strip */}
      <tr className={headerClassName}>
        <td
          colSpan={10}
          className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600"
        >
          {label}
        </td>
      </tr>

      {/* Data rows */}
      {rowIndices.map(({ row, idx }, position) => {
        const liveRow = liveValues?.[idx] ?? row;
        const priceBeforeDepre =
          Number.isFinite(liveRow.priceBeforeDepreciation) &&
          liveRow.priceBeforeDepreciation != null
            ? liveRow.priceBeforeDepreciation
            : computePriceBeforeDepre(liveRow);
        const totalDeprecPct =
          Number.isFinite(liveRow.totalDepreciationPercent) &&
          liveRow.totalDepreciationPercent != null
            ? liveRow.totalDepreciationPercent
            : computeTotalDeprecPct(liveRow);
        const depreciationAmt =
          Number.isFinite(liveRow.depreciationAmount) && liveRow.depreciationAmount != null
            ? liveRow.depreciationAmount
            : computeDepreciationAmt(liveRow);
        const valueAfterDepre =
          Number.isFinite(liveRow.valueAfterDepreciation) &&
          liveRow.valueAfterDepreciation != null
            ? liveRow.valueAfterDepreciation
            : computeValueAfterDepre(liveRow);

        return (
          <tr
            key={row.id ?? `new-${idx}`}
            onClick={() => onEdit(idx)}
            className="cursor-pointer border-b border-gray-100 hover:bg-primary-50/40 transition-colors"
          >
            <td className="border-r border-gray-100 px-2 py-2 text-center text-gray-500">
              {position + 1}
            </td>
            <td className="border-r border-gray-100 px-3 py-2 text-gray-800">
              {liveRow.description || <span className="text-gray-300 italic">—</span>}
            </td>
            <td className="border-r border-gray-100 px-2 py-2 text-right text-gray-700 tabular-nums">
              <NumCell value={liveRow.area} />
            </td>
            <td className="border-r border-gray-100 px-2 py-2 text-right text-gray-700 tabular-nums">
              <NumCell value={liveRow.pricePerSqM} />
            </td>
            <td className="border-r border-gray-100 px-2 py-2 text-right text-gray-700 tabular-nums">
              <NumCell value={priceBeforeDepre} />
            </td>
            <td className="border-r border-gray-100 px-2 py-2 text-right text-gray-700 tabular-nums">
              <IntCell value={liveRow.year} />
            </td>
            {/* Method pill */}
            <td className="border-r border-gray-100 px-2 py-2 text-center">
              <MethodPill method={liveRow.depreciationMethod} />
            </td>
            <td className="border-r border-gray-100 px-2 py-2 text-right text-gray-700 tabular-nums">
              {Number.isFinite(totalDeprecPct) ? (
                <span>{totalDeprecPct.toFixed(2)}</span>
              ) : (
                <span className="text-gray-300">—</span>
              )}
            </td>
            <td className="border-r border-gray-100 px-2 py-2 text-right text-orange-600 tabular-nums">
              <NumCell value={depreciationAmt} />
            </td>
            <td className="px-2 py-2 text-right text-green-700 tabular-nums font-medium">
              <NumCell value={valueAfterDepre} />
            </td>
          </tr>
        );
      })}

      {/* Subgroup subtotal */}
      <tr className={subtotalClassName}>
        <td className="border-r border-gray-200 px-2 py-1.5" />
        <td className="border-r border-gray-200 px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-500 italic">
          {label} subtotal
        </td>
        <td className="border-r border-gray-200 px-2 py-1.5 text-right tabular-nums text-gray-700 text-xs">
          {totalArea.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td className="border-r border-gray-200 px-2 py-1.5" />
        <td className="border-r border-gray-200 px-2 py-1.5 text-right tabular-nums text-gray-700 text-xs">
          {totalPriceBefore.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
        <td className="border-r border-gray-200 px-2 py-1.5" />
        <td className="border-r border-gray-200 px-2 py-1.5" />
        <td className="border-r border-gray-200 px-2 py-1.5" />
        <td className="border-r border-gray-200 px-2 py-1.5" />
        <td className="px-2 py-1.5 text-right tabular-nums text-green-700 text-xs font-semibold">
          {totalValueAfter.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      </tr>
    </>
  );
}

// ─── Per-model table section ──────────────────────────────────────────────────

interface ModelSectionProps {
  modelName: string;
  modelAgg: LandBuildingModelAggregate | undefined;
}

function ModelSection({ modelName, modelAgg }: ModelSectionProps) {
  const { control } = useFormContext<LandBuildingFormValues>();
  const { fields, append, update, remove } = useFieldArray({
    control,
    name: 'costOfBuildingItems',
  });

  const liveValues = useWatch({ control, name: 'costOfBuildingItems' }) as CostBuildingRow[];

  // Global indices belonging to this model
  const modelIndices = fields
    .map((f, idx) => ({ row: f as unknown as CostBuildingRow, idx }))
    .filter(({ row }) => row.modelName === modelName);

  // Split into Building / Non-Building subgroups — use live form values for accuracy
  const buildingSubgroup = modelIndices.filter(({ idx }) => {
    const liveRow = liveValues?.[idx];
    return liveRow ? liveRow.isBuilding !== false : true;
  });
  const nonBuildingSubgroup = modelIndices.filter(({ idx }) => {
    const liveRow = liveValues?.[idx];
    return liveRow ? liveRow.isBuilding === false : false;
  });

  // ─── Modal state ────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingGlobalIdx, setEditingGlobalIdx] = useState<number | null>(null);
  const [addIsBuilding, setAddIsBuilding] = useState(true);

  const openAdd = (isBuilding: boolean) => {
    setAddIsBuilding(isBuilding);
    setModalMode('add');
    setEditingGlobalIdx(null);
    setModalOpen(true);
  };

  const openEdit = (globalIdx: number) => {
    setModalMode('edit');
    setEditingGlobalIdx(globalIdx);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingGlobalIdx(null);
  };

  const handleSave = (data: CostBuildingRow) => {
    // Pre-compute derived fields so the row isn't blank before the next server preview round-trip
    const priceBeforeDepreciation = computePriceBeforeDepre(data);
    const totalDepreciationPercent = computeTotalDeprecPct(data);
    const depreciationAmount = computeDepreciationAmt(data);
    const valueAfterDepreciation = computeValueAfterDepre(data);

    const enriched: CostBuildingRow = {
      ...data,
      priceBeforeDepreciation,
      totalDepreciationPercent,
      depreciationAmount,
      valueAfterDepreciation,
    };

    if (modalMode === 'add') {
      append({
        ...enriched,
        id: null,
        category: 'CostOfBuilding',
        kind: 'BuildingConstruction',
        modelName,
        displaySequence: fields.length,
      });
    } else if (modalMode === 'edit' && editingGlobalIdx !== null) {
      update(editingGlobalIdx, {
        ...enriched,
        category: 'CostOfBuilding',
        kind: (fields[editingGlobalIdx] as unknown as CostBuildingRow).kind,
        modelName,
      });
    }
    closeModal();
  };

  const handleDelete = () => {
    if (editingGlobalIdx !== null) {
      remove(editingGlobalIdx);
    }
    closeModal();
  };

  // Overall footer totals (B09, B10, B11) — all rows in this model
  const modelLiveRows = liveValues ? liveValues.filter(r => r?.modelName === modelName) : [];

  const totalArea = modelLiveRows.reduce((acc, r) => acc + toN(r.area), 0);
  const totalPriceBefore = modelLiveRows.reduce((acc, r) => {
    return acc + (Number.isFinite(r.priceBeforeDepreciation) && r.priceBeforeDepreciation != null
      ? r.priceBeforeDepreciation
      : computePriceBeforeDepre(r));
  }, 0);
  const totalValueAfter = modelLiveRows.reduce((acc, r) => {
    return acc + (Number.isFinite(r.valueAfterDepreciation) && r.valueAfterDepreciation != null
      ? r.valueAfterDepreciation
      : computeValueAfterDepre(r));
  }, 0);

  const initialEditData =
    modalMode === 'edit' && editingGlobalIdx !== null
      ? (liveValues?.[editingGlobalIdx] ?? null)
      : null;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* ── Model header ── */}
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-bold">
            {modelName}
          </span>
          {modelAgg && (
            <span className="text-xs text-gray-500">
              {modelAgg.unitCount} units · Avg {fmt(modelAgg.avgLandAreaSqWa)} Sq.Wa ·
              Revenue {fmt(modelAgg.totalSellingPrice)} Baht
            </span>
          )}
        </div>
        {/* Split Add buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openAdd(true)}
            className="flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors"
          >
            <Icon name="plus" className="size-3" />
            Add Building
          </button>
          <button
            type="button"
            onClick={() => openAdd(false)}
            className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded transition-colors"
          >
            <Icon name="plus" className="size-3" />
            Add Non-Building
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          {/* ── Column-group headers (row 1) ── */}
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase tracking-wide">
              <th
                rowSpan={2}
                className="w-[32px] border-r border-b border-gray-200 px-2 py-1.5 text-center font-semibold"
              >
                #
              </th>
              <th
                rowSpan={2}
                className="border-r border-b border-gray-200 px-3 py-1.5 text-left font-semibold min-w-[160px]"
              >
                Building Details
              </th>
              <th
                rowSpan={2}
                className="w-[90px] border-r border-b border-gray-200 px-2 py-1.5 text-right font-semibold"
              >
                Area (Sq.M)
              </th>
              {/* RCN Before Depre. group header */}
              <th
                colSpan={2}
                className="border-r border-b border-gray-200 px-2 py-1.5 text-center font-semibold"
              >
                RCN Before Depre.
              </th>
              <th
                rowSpan={2}
                className="w-[50px] border-r border-b border-gray-200 px-2 py-1.5 text-right font-semibold"
              >
                Yr
              </th>
              {/* Depreciation group header — Method pill + Total % + Depre. Baht */}
              <th
                colSpan={3}
                className="border-r border-b border-gray-200 px-2 py-1.5 text-center font-semibold"
              >
                Depreciation
              </th>
              <th
                rowSpan={2}
                className="w-[120px] border-b border-gray-200 px-2 py-1.5 text-right font-semibold"
              >
                RCN After Depre.
              </th>
            </tr>
            {/* ── Sub-headers (row 2) ── */}
            <tr className="bg-gray-50 text-gray-500">
              {/* RCN sub-headers */}
              <th className="w-[90px] border-r border-b border-gray-200 px-2 py-1 text-right font-medium">
                Price/m²
              </th>
              <th className="w-[120px] border-r border-b border-gray-200 px-2 py-1 text-right font-medium">
                Price Before Depre.
              </th>
              {/* Depreciation sub-headers */}
              <th className="w-[60px] border-r border-b border-gray-200 px-2 py-1 text-center font-medium">
                Method
              </th>
              <th className="w-[65px] border-r border-b border-gray-200 px-2 py-1 text-right font-medium">
                Total %
              </th>
              <th className="w-[110px] border-r border-b border-gray-200 px-2 py-1 text-right font-medium">
                Depre. (Baht)
              </th>
            </tr>
          </thead>

          <tbody>
            {modelIndices.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-5 text-center text-gray-400 italic text-xs">
                  No rows yet — click Add Building or Add Non-Building to begin
                </td>
              </tr>
            ) : (
              <>
                <SubgroupRows
                  label="Building"
                  headerClassName="bg-primary-50/60"
                  subtotalClassName="bg-primary-50/30 border-t border-primary-100"
                  rowIndices={buildingSubgroup}
                  liveValues={liveValues}
                  onEdit={openEdit}
                />
                <SubgroupRows
                  label="Non-Building"
                  headerClassName="bg-amber-50/60"
                  subtotalClassName="bg-amber-50/30 border-t border-amber-100"
                  rowIndices={nonBuildingSubgroup}
                  liveValues={liveValues}
                  onEdit={openEdit}
                />
              </>
            )}
          </tbody>

          {/* ── Footer — B09/B10/B11 ── */}
          {modelIndices.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-800">
                <td className="border-r border-gray-200 px-2 py-2" />
                <td className="border-r border-gray-200 px-3 py-2 text-xs uppercase tracking-wide text-gray-500">
                  Total
                </td>
                {/* B09 — Σ area */}
                <td className="border-r border-gray-200 px-2 py-2 text-right tabular-nums text-gray-800">
                  {totalArea.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="border-r border-gray-200 px-2 py-2" />
                {/* B10 — Σ priceBeforeDepreciation */}
                <td className="border-r border-gray-200 px-2 py-2 text-right tabular-nums text-gray-800">
                  {totalPriceBefore.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="border-r border-gray-200 px-2 py-2" />
                <td className="border-r border-gray-200 px-2 py-2" />
                <td className="border-r border-gray-200 px-2 py-2" />
                <td className="border-r border-gray-200 px-2 py-2" />
                {/* B11 — Σ valueAfterDepreciation */}
                <td className="px-2 py-2 text-right tabular-nums text-green-700">
                  {totalValueAfter.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Modal ── */}
      <HypothesisCostOfBuildingModal
        isOpen={modalOpen}
        modelName={modelName}
        initialData={initialEditData}
        mode={modalMode}
        defaultIsBuilding={modalMode === 'add' ? addIsBuilding : true}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={modalMode === 'edit' ? handleDelete : undefined}
      />
    </div>
  );
}

// ─── Tab root ─────────────────────────────────────────────────────────────────

interface CostOfBuildingTabProps {
  models: Record<string, LandBuildingModelAggregate> | null;
}

export function CostOfBuildingTab({ models }: CostOfBuildingTabProps) {
  const modelNames = models ? Object.keys(models) : [];

  if (!models || modelNames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Icon name="upload" style="regular" className="size-8 text-gray-300" />
        <p className="text-sm text-gray-500 font-medium">No unit data uploaded yet</p>
        <p className="text-xs text-gray-400">
          Upload an Excel file on the Unit Details tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {modelNames.map(modelName => (
        <ModelSection key={modelName} modelName={modelName} modelAgg={models[modelName]} />
      ))}
    </div>
  );
}
