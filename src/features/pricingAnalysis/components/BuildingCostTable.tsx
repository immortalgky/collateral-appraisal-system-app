import clsx from 'clsx';
import { Fragment, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Icon } from '@/shared/components';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { toNumber } from '../../appraisal/components/BuildingTable/BuildingDetailTable';
import type { FormTableHeader } from '../../appraisal/components/BuildingTable/BuildingDetailTable';
import BuildingDetailPopUpModal from '../../appraisal/components/tables/BuildingDetailPopUpModal';
import { useBasePath } from '../../appraisal/context/AppraisalContext';
import { getPropertyHref, PROPERTY_TYPES } from '../../appraisal/utils/propertyTypeConfig';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import {
  buildingFinalCostValue,
  roundToThousand,
  sumBuildingFinalCostValue,
} from '../domain/calculation';
import { ScrollableTableContainer } from './ScrollableTableContainer';

export interface BuildingCostItem {
  propertyName?: string;
  propertyType?: string;
  depreciationDetails?: any[];
  [key: string]: unknown;
}

interface BuildingCostTableProps {
  buildingCost: BuildingCostItem[];
  onChange?: (updated: BuildingCostItem[]) => void;
  /**
   * Whether the Building Cost Value row explains where its figure came from — either that
   * it was hand-edited on the property form ("Edited on property · ±N vs table") or that it
   * was rounded from the table ("From table, rounded to nearest 1,000"). Defaults to
   * showing it, so a call site that says nothing (Profit Rent, via this same table) keeps
   * today's behaviour; Building Cost opts out of both lines.
   *
   * User-ruled, twice, on Building Cost specifically: with this off, nothing on the BC
   * screen distinguishes a hand-keyed figure from one that merely coincides with the
   * rounded total. No exposure today — 0 of 241 buildings carry an override.
   */
  showProvenance?: boolean;
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

function computeDerivedValues(
  rows: any[],
  rowIndex: number,
  allRows: any[],
  headers: FormTableHeader[],
): Record<string, any> {
  const row = { ...rows[rowIndex] };
  const outScopeFields = { buildingDepre: allRows };
  const getValues = () => undefined;

  for (let pass = 0; pass < 2; pass++) {
    for (const header of headers) {
      if ('compute' in header && 'name' in header && (header as any).compute) {
        const result = (header as any).compute({ rows, row, rowIndex, getValues, outScopeFields });
        row[(header as any).name] = Number.isFinite(result) ? result : 0;
      }
    }
  }

  return row;
}

// mock:1777 `data-sticky="190"` + mock:143 `.g .stk` — Detail freezes at 190px and
// ellipsises what does not fit. Same arrangement CostMachineSection.tsx:187 already
// ships: the right edge is a box-shadow keyed off ScrollableTableContainer's scrolled
// state (`group-data-[scrolled=true]`, enabled by its `edgeShadow` prop), not a border.
const STICKY_COL = 'areaDescription';
const STICKY_COL_BOX =
  'sticky left-0 w-[190px] min-w-[190px] max-w-[190px] overflow-hidden text-ellipsis ' +
  'shadow-[1px_0_0_#e3e9e8] transition-shadow duration-150 ' +
  'group-data-[scrolled=true]:shadow-[1px_0_0_#e3e9e8,6px_0_8px_-4px_rgba(16,24,32,0.22)]';
const isStickyCol = (header: FormTableHeader) =>
  'name' in header && header.name === STICKY_COL;

// Built from `t` rather than a module-level constant — the header labels/tooltips and the
// Building/Non-Building pill and Gross/Period cell text all need translation, and the compute/
// render closures below are the only place those strings are produced. Called fresh on each
// render (no memoization) — the same pattern HypothesisResidualWaterfall.tsx already uses for a
// t-built config array.
function buildPropertiesTableHeader(t: TFunction<'pricingAnalysis'>): FormTableHeader[] {
  return [
    {
      type: 'derived',
      headerName: t('costBuilding.table.detailHeader'),
      name: 'areaDescription',
      className: clsx('border-r border-r-[#eef2f2]', STICKY_COL_BOX),
      tooltip: t('costBuilding.table.detailTooltip'),
      // The grand total, distinct from each building's own closing `Total` row. Same words as
      // the KPI card above the table, deliberately: same number, same name, twice on one screen.
      footer: () => (
        <span className="text-[12px]">{t('costBuilding.table.totalBuildingCostValueLabel')}</span>
      ),
    },
    // mock:1778 carries Building/Non-Building as a per-row `ประเภท` pill rather than as
    // banded groups. Replaces ROW_GROUPING: with one band per building (not per type), the
    // distinction has nowhere else to live. Hex, not `bg-success-100`/`bg-amber-100` — these
    // are the mock's `--ok`/`--ok-wash` and `--warn`/`--warn-wash` (mock:36-40), and Tailwind
    // v4's named colours are OKLCH and do not land on them.
    {
      type: 'derived',
      name: 'isBuilding',
      headerName: t('costBuilding.table.typeHeader'),
      // Sized for the Thai pill, not the English one — measured on the live pill (clone-and-
      // swap, matched the offline numbers exactly on all four labels): "ไม่ใช่สิ่งปลูกสร้าง" at
      // the mock's own `px-[7px]` (mock:757-758, see below) renders ~91px, +16px for this
      // cell's `px-[8px]` on both sides = ~107px, against ~92px for "Non-Building". 108 leaves
      // a 1px margin over that, and is only 4px more than the pre-Thai 104. Don't trim this
      // to fit the English text — measure the Thai pill first, it's always the wider one.
      className: 'w-[108px] border-r border-r-[#eef2f2]',
      align: 'center',
      render: ({ value }) => (
        <span
          className={clsx(
            // Matches mock:757-758's `.pill` rule literally — `height: 18px; line-height: 18px;
            // padding: 0 7px;` — rather than reconstructing an equivalent, since the mock states
            // this as an explicit rule (not inherited), and reconstructing it via `leading-none`
            // + the old `px-[6px]` was the earlier, wrong guess: that inherited the table's own
            // `leading-[25px]` instead of setting the pill's own, so the pill's content came out
            // taller than the row's `h-[26px]` floor and dragged the row to 28px. `leading-none`
            // overcorrected the other way — flattening the pill to ~13px against the mock's 18.
            // `h-[18px]` + `leading-[18px]` here is exact, not approximate: 18 < 26, so the row
            // still can't be pushed by it either way.
            'inline-flex items-center justify-center text-[11px] font-medium h-[18px] leading-[18px] px-[7px] py-0 rounded-full',
            value ? 'bg-[#f0fdf4] text-[#15803d]' : 'bg-[#fffbeb] text-[#b45309]',
          )}
        >
          {value ? t('costBuilding.table.building') : t('costBuilding.table.nonBuilding')}
        </span>
      ),
      tooltip: t('costBuilding.table.typeTooltip'),
    },
    {
      type: 'derived',
      name: 'area',
      // The unit was only ever in the `title` tooltip, so nothing on screen said what this
      // column counts. mock:1778 names it in the header itself.
      headerName: t('costBuilding.table.areaHeader'),
      className: 'w-[92px] border-r border-r-[#eef2f2]',
      align: 'right',
      modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
      tooltip: t('costBuilding.table.areaHeader'),
      footer: ({ rows }: { rows: any[] }) => {
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const total = rows.reduce((acc, row) => acc + toNumber(row['area']), 0);
        return <span className="text-[12px]">{total.toLocaleString()}</span>;
      },
    },
    {
      type: 'group',
      groupName: 'replacementCost',
      headerName: t('costBuilding.table.rcnBeforeDepreHeader'),
      className: 'border-b border-b-[#eef2f2] border-r border-r-[#eef2f2]',
      align: 'center',
      tooltip: t('costBuilding.table.rcnBeforeDepreTooltip'),
    },
    {
      type: 'derived',
      groupName: 'replacementCost',
      name: 'pricePerSqMBeforeDepreciation',
      headerName: t('costBuilding.table.pricePerSqmHeader'),
      className: 'w-[80px] border-r border-r-[#eef2f2]',
      align: 'right',
      modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
      tooltip: t('costBuilding.table.pricePerSqmBeforeTooltip'),
    },
    {
      type: 'derived',
      groupName: 'replacementCost',
      name: 'priceBeforeDepreciation',
      headerName: t('costBuilding.table.totalPriceHeader'),
      className: 'w-[105px] border-r border-r-[#eef2f2]',
      align: 'right',
      modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
      compute: ({ row }) => toNum(row['area']) * toNum(row['pricePerSqMBeforeDepreciation']),
      tooltip: t('costBuilding.table.priceBeforeDepreciationTooltip'),
      isComputed: true,
      footer: ({ rows }: { rows: any[] }) => {
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const total = rows.reduce((acc, row) => acc + toNumber(row['priceBeforeDepreciation']), 0);
        return <span className="text-[12px]">{total.toLocaleString()}</span>;
      },
    },
    {
      type: 'derived',
      name: 'year',
      headerName: t('costBuilding.table.yearHeader'),
      className: 'w-[36px] border-r border-r-[#eef2f2]',
      align: 'right',
      modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
      tooltip: t('costBuilding.table.yearTooltip'),
    },
    {
      type: 'group',
      groupName: 'depreciation',
      headerName: t('costBuilding.table.depreciationHeader'),
      className: 'border-b border-b-[#eef2f2] border-r border-r-[#eef2f2]',
      align: 'center',
      tooltip: t('costBuilding.table.depreciationTooltip'),
    },
    {
      type: 'derived',
      groupName: 'depreciation',
      name: 'totalDepreciationPercentPerYear',
      headerName: t('costBuilding.table.percentPerYearHeader'),
      className: 'w-[38px] border-r border-r-[#eef2f2]',
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
      tooltip: t('costBuilding.table.percentPerYearTooltip'),
      isComputed: true,
    },
    {
      type: 'derived',
      headerName: t('costBuilding.table.totalPercentHeader'),
      groupName: 'depreciation',
      name: 'totalDepreciationPct',
      className: 'w-[38px] border-r border-r-[#eef2f2]',
      align: 'right',
      modifier: (value: string) => (Number(value) ? Number(value).toFixed(1) : value),
      compute: ({ rowIndex, outScopeFields }) => {
        const periods: any[] = outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];
        return periods.reduce((acc: number, b: any) => acc + toNum(b.totalDepreciationPct), 0);
      },
      tooltip: t('costBuilding.table.totalPercentTooltip'),
      isComputed: true,
    },
    {
      type: 'derived',
      groupName: 'depreciation',
      name: 'depreciationMethod',
      headerName: t('costBuilding.table.methodHeader'),
      className: 'w-[55px] border-r border-r-[#eef2f2]',
      align: 'center',
      // mock:1783 writes this cell plain (`<td>${meth}</td>`), not as a pill. A `modifier`
      // rather than dropping the mapping entirely: the raw field is only ever 'Gross' or the
      // period method, and ReadOnlyCell renders a falsy value as `0`, so a plain pass-through
      // would print `0` where a method is missing. This also retires the last rem-based
      // sizing in the grid (`text-[10px] px-1.5 py-0.5`), which at our 13px root rendered at
      // 0.8125x inside a table that is otherwise on exact px.
      modifier: (value: string) =>
        value === 'Gross' ? t('costBuilding.table.methodGross') : t('costBuilding.table.methodPeriod'),
      tooltip: t('costBuilding.table.methodTooltip'),
    },
    {
      type: 'derived',
      groupName: 'depreciation',
      name: 'priceDepreciation',
      headerName: t('costBuilding.table.totalPriceHeader'),
      className: 'w-[100px] border-r border-r-[#eef2f2]',
      align: 'right',
      modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
      compute: ({ rowIndex, outScopeFields }) => {
        const periods: any[] = outScopeFields.buildingDepre?.[rowIndex]?.depreciationPeriods ?? [];
        return periods.reduce((acc: number, b: any) => acc + toNum(b.priceDepreciation), 0);
      },
      tooltip: t('costBuilding.table.priceDepreciationTooltip'),
      isComputed: true,
      footer: ({ rows }: { rows: any[] }) => {
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const total = rows.reduce((acc, row) => acc + toNumber(row['priceDepreciation']), 0);
        return (
          <span className="text-[12px]">{total.toLocaleString()}</span>
        );
      },
    },
    {
      type: 'group',
      groupName: 'priceAfterDepreciation',
      headerName: t('costBuilding.table.rcnAfterDepreHeader'),
      className: 'border-b border-b-[#eef2f2]',
      align: 'center',
      tooltip: t('costBuilding.table.rcnAfterDepreTooltip'),
    },
    // mock:1778 orders this pair per-unit first, then total — the reverse of the
    // Depreciation group beside it. `computeDerivedValues` runs two passes, so the
    // per-unit cell still lands on the final total despite now being computed first.
    {
      type: 'derived',
      groupName: 'priceAfterDepreciation',
      name: 'pricePerSqMAfterDepreciation',
      headerName: t('costBuilding.table.pricePerSqmHeader'),
      className: 'w-[85px] border-r border-r-[#eef2f2]',
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
          <span className="text-[12px]">
            {Math.round(totalAfter / totalArea).toLocaleString()}
          </span>
        );
      },
      tooltip: t('costBuilding.table.pricePerSqmAfterTooltip'),
      isComputed: true,
    },
    {
      type: 'derived',
      groupName: 'priceAfterDepreciation',
      name: 'priceAfterDepreciation',
      headerName: t('costBuilding.table.totalPriceHeader'),
      className: 'w-[110px]',
      align: 'right',
      modifier: (value: string) => (Number(value) ? Number(value).toLocaleString() : value),
      compute: ({ row }) => toNum(row['priceBeforeDepreciation']) - toNum(row['priceDepreciation']),
      footer: ({ rows }: { rows: any[] }) => {
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const total = rows.reduce((acc, row) => acc + toNumber(row['priceAfterDepreciation']), 0);
        return <span className="text-[12px]">{total.toLocaleString()}</span>;
      },
      tooltip: t('costBuilding.table.priceAfterDepreciationTooltip'),
      isComputed: true,
    },
  ];
}

// mock:172-177 `.g tr.band td` — one collapsible band per building. `#edf1f1` is the mock's
// `--surface-3` and `#55636f` its `--ink-2` (mock:24, 29), as hex because Tailwind v4's names
// are OKLCH. The fill must be opaque: this row's first cell is frozen, and a translucent
// background lets the columns scrolling underneath show through it.
const BAND_CELL =
  'px-[8px] py-0 h-[21px] leading-[21px] bg-[#edf1f1] text-[11px] font-semibold ' +
  'text-[#55636f] tracking-[0.02em] border-b border-b-[#eef2f2]';

function BandRow({
  label,
  collapsed,
  onToggle,
  restColSpan,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  restColSpan: number;
}) {
  return (
    <tr className="cursor-pointer select-none" onClick={onToggle}>
      {/* mock:1414 puts the label in the frozen cell and spans the remainder with one
          empty td, so the building's name stays put while the figures scroll. */}
      <td className={clsx(BAND_CELL, 'z-10', STICKY_COL_BOX)}>
        <span className="inline-flex items-center gap-[4px]">
          {/* Deliberate departure from mock:1414, which draws a raw `▾` glyph because it is
              standalone HTML with no icon set. This app has one, and all 12 sibling
              collapsibles use it, so the typographic triangle sat off the baseline at a
              different weight from every neighbour. The rotation is still the mock's:
              resting chevron-down, turned -90deg when shut, over mock:176's 0.15s.
              Sized by font-size rather than `size-*`: `.icon` (index.css:215) sets
              width/height to 1em and is declared after the Tailwind import, so at equal
              specificity it wins and a `size-*` utility would not take. The wrapper keeps
              the 10px slot either way, so the label cannot shift as the icon turns.
              No `text-gray-400` from the siblings — `.icon` is `fill: currentColor`, and
              this band's ink is #55636f, darker than a form header. */}
          <span
            className={clsx(
              'inline-flex w-[10px] shrink-0 items-center justify-center',
              'transition-transform duration-150',
              collapsed && '-rotate-90',
            )}
          >
            <Icon style="solid" name="chevron-down" className="text-[10px] text-[#55636f]" />
          </span>
          {label}
        </span>
      </td>
      <td className={BAND_CELL} colSpan={restColSpan} />
    </tr>
  );
}

function ReadOnlyTableHeader({
  header,
  index,
  allHeaders,
  hasGroups,
}: {
  header: FormTableHeader;
  index: number;
  allHeaders: FormTableHeader[];
  hasGroups: boolean;
}) {
  // The frozen Detail header is a corner cell — sticky on both axes — so it has to sit
  // above the other sticky headers, which are later siblings and would paint over it.
  // mock:145 `.g thead .stk` raises its z-index for the same reason.
  // mock:132-146 `.g thead th` — near-white, not the green band this used to paint:
  // `--surface-2` #f8fafa behind `--ink-2` #55636f at weight 500, with `--line` #e3e9e8
  // closing the head. Hex because Tailwind v4's named colours are OKLCH and miss these.
  // The fill sits on the cell, never the row: these are sticky, so a row background would
  // not travel with them and the columns would scroll through.
  const thBase = clsx(
    'text-[#55636f] text-[12px] font-medium px-[8px] py-0 leading-[26px] truncate',
    'sticky top-0 bg-[#f8fafa] border-b border-b-[#e3e9e8]',
    isStickyCol(header) ? 'z-30' : 'z-20',
  );

  if (header.type === 'group') {
    const colSpan = allHeaders.filter(
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
}: {
  header: FormTableHeader;
  row: any;
  rowIndex: number;
}) {
  if (header.type === 'group') return null;

  const h = header as any;
  const tdClass = clsx(
    'px-[8px] py-0 h-[26px] border-b border-b-[#eef2f2] whitespace-nowrap truncate',
    alignClass(header.align),
    // A frozen cell leaves the row's background behind, so it needs its own opaque one —
    // otherwise the columns scrolling underneath show through it.
    isStickyCol(header) && 'z-10 bg-white',
    header.className,
  );

  const rawValue = row[h.name];
  const displayValue = h.modifier ? h.modifier(rawValue) : rawValue;

  if (h.render) {
    return <td className={tdClass}>{h.render({ value: rawValue, row, rowIndex })}</td>;
  }

  return (
    <td className={tdClass}>
      <span className="truncate text-[#1f2937]">
        {displayValue != null && displayValue !== '' && displayValue !== 0 ? displayValue : 0}
      </span>
    </td>
  );
}

function SubtotalRow({
  rows,
  subtotalClassName,
  hasActionCol,
  label,
  visibleHeaders,
}: {
  rows: any[];
  subtotalClassName?: string;
  hasActionCol: boolean;
  /** Replaces the Detail column's own footer, for a subtotal that needs naming. */
  label?: string;
  visibleHeaders: FormTableHeader[];
}) {
  return (
    <tr className={clsx('border-t border-t-[#eef2f2]', subtotalClassName)}>
      {visibleHeaders.map((header, colIdx) => {
        const h = header as any;
        const footerFn = h.footer;
        const sticky = isStickyCol(header);
        // mock:178 `.g tr.tot` is a uniform weight 600 with no per-column colour, so the
        // weight lives on the cell and the footer spans carry none of their own.
        const tdClass = clsx(
          'px-[8px] py-0 h-[26px] border-b border-b-[#eef2f2] font-semibold',
          alignClass(header.align),
          // Repeat the row's tint on the frozen cell — it carries no background of its own.
          sticky && ['z-10', STICKY_COL_BOX, subtotalClassName],
        );

        if (sticky && label) {
          return (
            <td key={colIdx} className={tdClass}>
              <span className="text-[12px]">{label}</span>
            </td>
          );
        }

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
            <span className="inline-flex items-center justify-center text-[12px]">
              {content}
            </span>
          </td>
        );
      })}
      {/* action column spacer */}
      {hasActionCol && <td className="px-[8px] py-0 h-[26px] border-b border-b-[#eef2f2]" />}
    </tr>
  );
}

// mock:1788 closes every building with a second row (`tr.fcrow`) carrying the Building Cost
// Value — the name the backend already uses for it (BuildingCostSql), and the name the
// property form shows, which is the one place it can be edited. The figure itself is what
// the rest of the system already uses: CostBuildingPanel.tsx sums it per
// building, and the backend's PricingPropertyDataService applies the identical rule
// (`FinalCostValueOverride ?? ROUND(SUM(PriceAfterDepreciation), -3)`). Until now nothing on
// this screen showed it, so the per-row depreciation figures ran straight into a group total
// no cell explained. Read-only by design: the only editable figure on the BC screen is the
// method value in CostBuildingPanel, and per-building edits belong to the building detail
// form. `#f0fdfa` is the mock's own `--accent-wash` (mock:33) written as hex, because
// Tailwind v4's named colours are OKLCH and do not land on it.
const FC_ROW_BG = 'bg-[#f0fdfa]';

function FinalCostRow({
  building,
  rows,
  basePath,
  hasActionCol,
  showProvenance,
  visibleHeaders,
}: {
  building: BuildingCostItem;
  rows: any[];
  basePath: string;
  hasActionCol: boolean;
  showProvenance: boolean;
  visibleHeaders: FormTableHeader[];
}) {
  const { t } = useTranslation('pricingAnalysis');
  const derived = roundToThousand(
    rows.reduce((acc, row) => acc + toNumber(row['priceAfterDepreciation']), 0),
  );
  const override = building.finalCostValueOverride as number | null | undefined;
  // One rule, one place: this used to restate `override ?? roundToThousand(sum)` inline and could
  // drift from the helper the KPI cards and the footer price against. `derived` stays because the
  // provenance line below needs the unrounded comparison, which the helper does not expose.
  // Fed the COMPUTED rows, not `building.depreciationDetails`: the stored priceAfterDepreciation
  // goes stale the moment the appraiser edits the schedule, and `diff` right below compares this
  // against a computed-row total — mixing the two would print a provenance delta that is an
  // artefact of the mismatch rather than of anything the appraiser did.
  const finalCost = buildingFinalCostValue({ ...building, depreciationDetails: rows });
  const diff = finalCost - derived;

  // Both lines are now gated by the same flag — user-ruled twice on BC: first the rounding
  // note went (via `showProvenance`'s predecessor `showRoundingNote`), now the override line
  // too. Profit Rent (which passes nothing, so this defaults to `true`) still gets both.
  const provenance = !showProvenance
    ? ''
    : override != null
      ? t('costBuilding.table.editedOnPropertyDiff', {
          diff: `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff).toLocaleString()}`,
        })
      : t('costBuilding.table.fromTableRounded');

  // Undefined (plain text, not a dead link) when the route can't be built — see getPropertyHref.
  const href = getPropertyHref(
    basePath,
    building.propertyType as string | undefined,
    building.propertyId as string | undefined,
  );

  const cellBase = clsx('px-[8px] py-0 h-[30px] border-b border-b-[#eef2f2]', FC_ROW_BG);
  // Label, the shortcut spanning the middle, provenance over the two columns before the
  // total, and the value under the group's own total column — the mock's 1 / 8 / 2 / 1 split
  // over its wider header. Derived so an added column widens the shortcut, not the value.
  const shortcutSpan = visibleHeaders.length - 4;

  return (
    <tr className={clsx('border-t border-t-[#eef2f2]', FC_ROW_BG)}>
      {/* The frozen cell carries no row background of its own, so it repeats the tint. */}
      <td className={clsx(cellBase, 'z-10', STICKY_COL_BOX)}>
        <span className="text-[12px] font-bold text-[#0f766e]">
          {t('costBuilding.table.buildingCostValueLabel')}
        </span>
      </td>
      <td className={clsx(cellBase, 'text-left')} colSpan={shortcutSpan}>
        {href ? (
          <Link
            to={href}
            target="_blank"
            rel="noopener noreferrer"
            title={t('costBuilding.table.editOnBuildingDetailTitle')}
            className="text-[10.5px] text-[#0f766e] underline"
          >
            {t('costBuilding.table.editOnBuildingDetail')}
          </Link>
        ) : null}
      </td>
      <td className={clsx(cellBase, 'text-right')} colSpan={2}>
        <span className="text-[10.5px] text-[#8a96a0]">{provenance}</span>
      </td>
      <td className={clsx(cellBase, 'text-right')}>
        <span className="text-[12px] font-bold text-[#0f766e]">{finalCost.toLocaleString()}</span>
      </td>
      {hasActionCol && <td className={cellBase} />}
    </tr>
  );
}

// mock:180 `.g tr.fin` — the grand total: weight 700 on #f8fafa in #1f2937, closed by a
// single 1px #cbd5d3 rule rather than the 2px grey one this carried.
function FooterRow({
  allRows,
  hasActionCol,
  visibleHeaders,
  overrides,
}: {
  allRows: any[];
  hasActionCol: boolean;
  visibleHeaders: FormTableHeader[];
  /**
   * Cells the GRAND total computes differently from the per-building subtotals, keyed by column
   * name. The two share every column's `footer`, and for a subtotal ("รวมตามตาราง") the raw
   * schedule sum is the right answer — only the grand total has to price against each building's
   * Final Cost Value instead.
   */
  overrides?: Record<string, () => ReactNode>;
}) {
  return (
    <tfoot className="bg-[#f8fafa] border-t border-t-[#cbd5d3]">
      <tr>
        {visibleHeaders.map((header, inner_index) => {
          const h = header as any;
          const footer = h.footer;
          // The fill goes per cell, not just on the tfoot: these cells are sticky, so the
          // tfoot's background does not travel with them and rows showed through. Weight and
          // colour live here too — mock:180 `tr.fin` is uniform 700 on #1f2937, so the
          // per-column footer spans must not carry their own.
          const tdClass = clsx(
            'px-[8px] py-0 h-[26px] sticky bottom-0 bg-[#f8fafa] font-bold text-[#1f2937]',
            alignClass(header.align),
            isStickyCol(header) && ['z-10', STICKY_COL_BOX],
          );

          switch (header.type) {
            case 'derived': {
              const override = overrides?.[h.name];
              return (
                <td key={inner_index} className={tdClass}>
                  <span className="inline-flex items-center justify-center text-[12px]">
                    {override ? override() : footer ? footer({ rows: allRows }) : ''}
                  </span>
                </td>
              );
            }
            case 'input-number':
              return (
                <td key={inner_index} className={tdClass}>
                  <span className="inline-flex items-center justify-center text-[12px]">
                    {footer ? footer(allRows) : ''}
                  </span>
                </td>
              );
            case 'input-text':
              return (
                <td key={inner_index} className={tdClass}>
                  <span className="inline-flex items-center justify-center text-[12px]">
                    {footer ? footer(allRows.map((v: any) => v[h.name])) : ''}
                  </span>
                </td>
              );
            default:
              return (
                <td
                  key={inner_index}
                  className="px-[8px] py-0 h-[26px] sticky bottom-0 right-0 bg-[#f8fafa]"
                />
              );
          }
        })}
        {hasActionCol && (
          <td className="px-[8px] py-0 h-[26px] sticky bottom-0 right-0 bg-[#f8fafa]" />
        )}
      </tr>
    </tfoot>
  );
}

export function BuildingCostTable({
  buildingCost,
  onChange,
  showProvenance = true,
}: BuildingCostTableProps) {
  const { t } = useTranslation('pricingAnalysis');
  const isReadOnly = usePageReadOnly();
  const basePath = useBasePath();
  const propertiesTableHeader = buildPropertiesTableHeader(t);
  const hasGroups = propertiesTableHeader.some(h => h.type === 'group');
  const visibleHeaders = propertiesTableHeader.filter(h => h.type !== 'group');
  const subHeaders = propertiesTableHeader.filter(
    h => 'groupName' in h && h.type !== 'group',
  ) as FormTableHeader[];

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

  // Collapsed bands, by building index — mock:1413 keeps the same shape (`state.shut`).
  const [collapsedBands, setCollapsedBands] = useState<Set<number>>(new Set());
  const toggleBand = (bIdx: number) =>
    setCollapsedBands(prev => {
      const next = new Set(prev);
      if (!next.delete(bIdx)) next.add(bIdx);
      return next;
    });

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
    const computedRows = rawRows.map((_, rIdx) =>
      computeDerivedValues(rawRows, rIdx, rawRows, propertiesTableHeader),
    );
    return { building, bIdx, rawRows, computedRows };
  });

  const allComputedRows = buildings.flatMap(b => b.computedRows);
  const isEmpty = allComputedRows.length === 0 && !canEdit;

  // The grand total is the sum of each building's Final Cost Value, not of the raw schedule rows:
  // a building whose appraiser keyed a Final Cost Value on the property form is worth that, and
  // summing `priceAfterDepreciation` across the flattened rows drops every such override — which
  // is why this cell and the KPI strip above it printed different numbers under one label.
  //
  // Same helper as the KPI strip (CostBuildingPanel.tsx:126), but fed this table's computed rows
  // rather than the stored `depreciationDetails`, for the reason FinalCostRow gives below. On the
  // only live call site the schedule is read-only (no `onChange`), so the two inputs re-derive the
  // same figures and the numbers agree; an editable one could drift for as long as an edit is
  // unsaved.
  // Each building's computed rows, not its stored ones, for the same reason FinalCostRow uses
  // them: the footer sits under a table the appraiser can edit and has to show what is on screen.
  const grandTotalFinalCost = sumBuildingFinalCostValue(
    buildings.map(b => ({ ...b.building, depreciationDetails: b.computedRows })),
  );
  const grandTotalArea = allComputedRows.reduce((acc, row) => acc + toNumber(row['area']), 0);
  const footerOverrides = {
    priceAfterDepreciation: () => (
      <span className="text-[12px]">{grandTotalFinalCost.toLocaleString()}</span>
    ),
    // Restates the cell above per square metre, so it has to divide the same number — left on the
    // raw sum it would read 99,000 against a 14,000,000 total, which multiplies back to neither.
    pricePerSqMAfterDepreciation: () =>
      grandTotalArea === 0 ? null : (
        <span className="text-[12px]">
          {Math.round(grandTotalFinalCost / grandTotalArea).toLocaleString()}
        </span>
      ),
  };

  const visibleColCount = visibleHeaders.length + (canEdit ? 1 : 0); // +1 actions

  // The active row's raw data for the modal
  const activeRawRow =
    activeRowIdx !== undefined
      ? ((buildingCost[activeBuildingIdx]?.depreciationDetails ?? [])[activeRowIdx] ?? null)
      : null;

  return (
    <>
      {/* No frame and no rounded corners. The mock wraps the table in `.scwrap` (mock:262)
          and `.scroller` (mock:567), both borderless — its only edge decoration is the
          `.scwrap::after` right-edge shadow, which is the sticky-column shadow and lives on
          ScrollableTableContainer's `edgeShadow`, not here. With the outer card gone the
          table sits directly against the tab body, as the mock has it. */}
      <div className="w-full max-h-full flex flex-col overflow-clip">
        <ScrollableTableContainer className="w-full h-full" edgeShadow>
          <table className="table min-w-max w-full border-separate border-spacing-0 text-[12px] leading-[25px] tabular-nums rounded-none">
            <thead>
              <tr>
                {propertiesTableHeader.map((header, index) => (
                  <ReadOnlyTableHeader
                    key={index}
                    header={header}
                    index={index}
                    allHeaders={propertiesTableHeader}
                    hasGroups={hasGroups}
                  />
                ))}
                {canEdit && (
                  <th
                    className="text-[#55636f] text-[12px] font-medium px-[8px] py-0 leading-[26px] text-center w-16 bg-[#f8fafa] sticky top-0 right-0 z-21 border-l border-l-[#eef2f2] border-b border-b-[#e3e9e8]"
                    rowSpan={hasGroups ? 3 : 1}
                  />
                )}
              </tr>

              {hasGroups && (
                <tr>
                  {subHeaders.map((header, index) => (
                    <th
                      key={index}
                      className={clsx(
                        // mock:146 pins the second header row at 27px — the first row's 26px
                        // line-height plus its 1px bottom border — not at 0, where it would
                        // ride up under the row above it.
                        'text-[#55636f] text-[12px] font-medium px-[8px] py-0 leading-[26px] truncate',
                        'bg-[#f8fafa] sticky top-[27px] z-20 border-b border-b-[#e3e9e8]',
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

            <tbody className="divide-y divide-[#eef2f2]">
              {!isEmpty &&
                buildings.map(({ building, bIdx, computedRows }) => {
                  if (computedRows.length === 0 && !canEdit) return null;

                  // Split on presence of a row, not on a non-zero sum: a zeroed Building row
                  // is still a row the appraiser entered, and the Building subtotal reading 0
                  // is itself the answer to "how much of this is insurable". Every row lands
                  // on exactly one side (a missing `isBuilding` counts as non-building), so
                  // the two always add up to the table total — which is what makes it a check.
                  const buildingRows = computedRows.filter((r: any) => Boolean(r.isBuilding));
                  const nonBuildingRows = computedRows.filter((r: any) => !r.isBuilding);
                  // Only when the building has both kinds. With one kind the subtotal would
                  // restate the table total digit for digit, directly above it.
                  const showPerTypeSubtotals =
                    buildingRows.length > 0 && nonBuildingRows.length > 0;

                  return (
                    <Fragment key={bIdx}>
                      {/* One collapsible band per building (mock:1781-1782), replacing both
                          the old property-name row and the Building/Non-Building bands
                          inside it. The type now rides each row as a pill column, which is
                          how the mock carries it. */}
                      <BandRow
                        label={t('costBuilding.table.bandLabel', {
                          index: bIdx + 1,
                          name:
                            building.propertyName ||
                            t('costBuilding.table.propertyFallback', { index: bIdx + 1 }),
                          // The raw code ('B', 'LB', …) is meaningless on screen — resolve it
                          // through the same code→name table the property type picker uses.
                          // Only the code is resolved this way; `PROPERTY_TYPES.type` is plain
                          // English with no th/zh translation anywhere else in the app (see
                          // PropertyTypePicker.tsx, MarketComparableListingPage.tsx), so
                          // translating it here alone would be a one-off no sibling screen
                          // matches — flagging that rather than inventing an 11-entry i18n
                          // table for a domain this pass doesn't otherwise touch.
                          type:
                            PROPERTY_TYPES.find(p => p.code === building.propertyType)?.type ??
                            building.propertyType ??
                            '',
                          count: computedRows.length,
                        })}
                        collapsed={collapsedBands.has(bIdx)}
                        onToggle={() => toggleBand(bIdx)}
                        restColSpan={visibleColCount - 1}
                      />

                      {!collapsedBands.has(bIdx) && (
                        <>
                          {computedRows.map((row, rowIdxInBuilding) => (
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
                                  />
                                );
                              })}
                              {canEdit && (
                                <td
                                  className="py-1 px-1.5 sticky right-0 z-10 bg-white border-l border-l-[#eef2f2] border-b border-b-[#eef2f2]"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <div className="flex gap-0.5 justify-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRequestEdit(bIdx, rowIdxInBuilding)}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                                      title={t('costBuilding.table.editAction')}
                                    >
                                      <Icon style="solid" name="pen" className="size-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRequestDelete(bIdx, rowIdxInBuilding)}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-danger-50 text-danger-600 hover:bg-danger-100 transition-colors"
                                      title={t('costBuilding.table.deleteAction')}
                                    >
                                      <Icon style="solid" name="trash" className="size-2.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}

                          {/* Per-type subtotals. Not a return to the old type-banded
                              sections — the band is per building and the type rides each row
                              as a pill. This is only the Building-only sum, kept because it
                              is the on-screen cross-check against the figure that drives
                              building insurance value on the property form. Plain `bg-white`
                              on purpose: lightest of the three closing rows, so it reads as a
                              check line and leaves the teal Building Cost Value row emphatic.
                              An opaque fill is mandatory, not cosmetic — SubtotalRow puts
                              this class on the frozen cell, and without one the columns
                              scrolling underneath show through it. */}
                          {showPerTypeSubtotals && (
                            <>
                              <SubtotalRow
                                rows={buildingRows}
                                subtotalClassName="bg-white"
                                hasActionCol={canEdit}
                                label={t('costBuilding.table.buildingSubtotal')}
                                visibleHeaders={visibleHeaders}
                              />
                              <SubtotalRow
                                rows={nonBuildingRows}
                                subtotalClassName="bg-white"
                                hasActionCol={canEdit}
                                label={t('costBuilding.table.nonBuildingSubtotal')}
                                visibleHeaders={visibleHeaders}
                              />
                            </>
                          )}

                          {/* Per-building subtotal — mock:1787 closes every building with
                              one (`รวมตามตาราง`), over all of its rows. `bg-[#f8fafa]` is
                              the mock's own `tr.tot` fill (mock:178 `--surface-2`), written
                              as hex because Tailwind v4's named colours are OKLCH. */}
                          <SubtotalRow
                            rows={computedRows}
                            subtotalClassName="bg-[#f8fafa]"
                            hasActionCol={canEdit}
                            label={t('costBuilding.table.tableTotal')}
                            visibleHeaders={visibleHeaders}
                          />

                          {/* Second of the two closing rows per building, per mock:1788.
                              Collapsing the band hides both, as `g(id)` does in the mock. */}
                          <FinalCostRow
                            building={building}
                            rows={computedRows}
                            basePath={basePath}
                            hasActionCol={canEdit}
                            showProvenance={showProvenance}
                            visibleHeaders={visibleHeaders}
                          />

                          {canEdit && (
                            <tr>
                              <td
                                colSpan={visibleColCount}
                                className="p-2 border-b border-b-[#eef2f2] bg-gray-50"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleRequestAdd(bIdx)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors rounded"
                                >
                                  <Icon style="solid" name="plus" className="size-3" />
                                  {t('costBuilding.table.addRow')}
                                </button>
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </Fragment>
                  );
                })}
            </tbody>

            {!isEmpty && allComputedRows.length > 0 && (
              <FooterRow
                allRows={allComputedRows}
                hasActionCol={canEdit}
                visibleHeaders={visibleHeaders}
                overrides={footerOverrides}
              />
            )}
          </table>
        </ScrollableTableContainer>

        {/* Empty State */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-6 px-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <Icon style="solid" name="building" className="size-5 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-0.5">
              {t('costBuilding.table.noDepreciationData')}
            </h3>
            <p className="text-xs text-gray-500 text-center max-w-sm">
              {t('costBuilding.table.noDepreciationDataHint')}
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
        title={t('costBuilding.table.deleteConfirmTitle')}
        message={t('costBuilding.table.deleteConfirmMessage')}
        confirmText={t('costBuilding.table.deleteAction')}
        cancelText={t('footer.cancel')}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteConfirm(null)}
        variant="danger"
      />
    </>
  );
}
