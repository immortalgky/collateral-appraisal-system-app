import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import TextInput from '@/shared/components/inputs/TextInput';
import { FormCard } from '@/shared/components/sections';

import { isCondo } from '../../../types';
import type { ProjectType, ProjectUnitPrice } from '../../../types';
import { locationContribution } from '../../../utils/recomputeUnitPrice';
import { useCondoFocus } from '../CondoShellContext';
import { Dash, FilterChip, ToolbarDropdown, WarningNote } from './look';
import { TOOLBAR, dataRow, dataTable } from './lookClasses';

const FLAGS = [
  { flag: 'isCorner', amount: 'cornerAdjustment', labelKey: 'unitPrice.cols.corner' },
  { flag: 'isEdge', amount: 'edgeAdjustment', labelKey: 'unitPrice.cols.edge' },
  { flag: 'isPoolView', amount: 'poolViewAdjustment', labelKey: 'unitPrice.cols.poolView' },
  { flag: 'isSouth', amount: 'southAdjustment', labelKey: 'unitPrice.cols.south' },
  {
    flag: 'isNearGarden',
    amount: 'nearGardenAdjustment',
    labelKey: 'unitPrice.cols.nearGardenClubhouse',
  },
  { flag: 'isOther', amount: 'otherAdjustment', labelKey: 'unitPrice.cols.other' },
] as const;

export type FlagKey = (typeof FLAGS)[number]['flag'];
type AmountKey = (typeof FLAGS)[number]['amount'];

/** The locations each project type prices (the order is FLAGS'): the assumption panel has the same rows. */
const FLAGS_OF: Record<ProjectType, readonly FlagKey[]> = {
  U: ['isCorner', 'isEdge', 'isPoolView', 'isSouth', 'isOther'],
  LB: ['isCorner', 'isEdge', 'isNearGarden', 'isOther'],
  L: ['isCorner', 'isEdge', 'isOther'],
};
export type FlagAmounts = Partial<Record<AmountKey, number | string | null>> & {
  /** How the flag total is folded into the value; the hint in the location-total column follows it. */
  locationMethod?: string | null;
};

/** The figures a recompute can change, compared against the stored row to highlight a cell. */
type CalculatedField =
  | 'standardPrice'
  | 'adjustPriceLocation'
  | 'priceIncrementPerFloor'
  | 'landAreaDifference'
  | 'landIncreaseDecreaseAmount'
  | 'totalAppraisalValue'
  | 'totalAppraisalValueRounded'
  | 'forceSellingPrice'
  | 'coverageAmount';

type Band = 'unit' | 'vars' | 'res';

// Edge fade (the group's `data-fade-left` is set from the scroll position): a soft shadow over the
// columns scrolling under the frozen identity block. `--fade` is defined on the scroller.
const FADE_AFTER =
  'after:pointer-events-none after:absolute after:inset-y-0 after:left-full after:w-[22px] after:bg-linear-to-r after:from-(--fade) after:to-transparent after:opacity-0 after:transition-opacity group-data-[fade-left]/tw:after:opacity-100';

const fmt = (v: number) =>
  v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Stored money has two decimals; a previewed figure can carry a third that rounds away.
const sameFigure = (a?: number | null, b?: number | null) =>
  a == null || b == null ? a == b : Math.abs(a - b) < 0.010001;

interface RowCtx {
  up: ProjectUnitPrice;
  /** The unit's model has a standard price (always true in the Imported view). */
  modelPriced: boolean;
  /** The unit carries a price AND its model can price it: results show "—" otherwise. */
  priced: boolean;
  /** The stored row, set only while a preview is on screen. */
  base?: ProjectUnitPrice;
}

interface Col {
  key: string;
  band: 'id' | Band;
  header: string;
  right?: boolean;
  /** Centred (the sequence number and the floor); `right` wins if both are set. */
  center?: boolean;
  /** Sticky left offset in rem (the two identifying columns). */
  left?: number;
  cell: (r: RowCtx) => ReactNode;
  foot?: ReactNode;
}

export interface CondoPriceResultsProps {
  /**
   * Decides the columns and the location chips: U (tower / floor), LB (plot / house, land and
   * standard price per house) or L (land only: no model, so no standard price or fire cover).
   */
  projectType: ProjectType;
  /** What to show: the stored rows, or the recompute while previewing. */
  rows: ProjectUnitPrice[];
  /** The stored rows, to highlight changed cells and compute the difference while previewing. */
  baseline: ProjectUnitPrice[] | undefined;
  /** Whether the unit's model has a standard price. */
  modelPriced: (up: ProjectUnitPrice) => boolean;
  /** Imported view: stored values only, no flags or the columns derived from them. */
  imported: boolean;
  /** The stored prices really are an import (title and pill follow the stored data). */
  showingImported: boolean;
  /** `edit`: the user changed assumptions or flags. `switch`: Calculated shown over an imported list. */
  preview: 'edit' | 'switch' | null;
  /** How many units a recalculation would change (0 hides the hint). */
  recalcCount: number;
  /**
   * Units that hold a stored price although their model has no standard price: a recompute
   * leaves them out, and a Save would price them without one. Said in the hint and the note.
   */
  noStandardCount: number;
  /** Per-location amounts, for the amount on a lit flag chip. */
  amounts: FlagAmounts | null | undefined;
  /** Chips toggle (false on a read-only page: lit chips only). */
  flagsEditable: boolean;
  /** A save is running or the data is being refreshed: chips are inert. */
  locked: boolean;
  onToggleFlag: (unitId: string, flag: FlagKey, value: boolean) => void;
  /** Back to the stored values; offered while previewing an edit. */
  onReset?: () => void;
  isLoading: boolean;
  /** Replaces the table, e.g. a failed load with its retry. */
  error?: ReactNode;
  /** Under the head: what the last "Save and recalculate" changed, until dismissed. */
  recalcSummary?: ReactNode;
  /** The price-source switch, first in the right end of the head. */
  sourceSwitch: ReactNode;
  /** Imported view, in the head: the file, the template, the upload. */
  importControls?: ReactNode;
  /** Under the head: what the Imported view still has to say (nothing priced yet...). */
  notice?: ReactNode;
  /** Calculated view: the read-only model assumptions, folded under the head behind a toggle. */
  assumptions?: {
    modelCount: number;
    pricedCount: number;
    /** The table, or its loading / error state; rendered only while expanded. */
    table: ReactNode;
  };
}

/**
 * The results area of the unit-price tab (condo, LB and L): one head row, filters, band toggles and
 * the table.
 */
export function CondoPriceResults({
  projectType,
  rows,
  baseline,
  modelPriced,
  imported,
  showingImported,
  preview,
  recalcCount,
  noStandardCount,
  amounts,
  flagsEditable,
  locked,
  onToggleFlag,
  onReset,
  isLoading,
  error,
  recalcSummary,
  sourceSwitch,
  importControls,
  notice,
  assumptions,
}: CondoPriceResultsProps) {
  const { t } = useTranslation('blockProject');
  const { focus, onFocusChange } = useCondoFocus();
  const condo = isCondo(projectType);
  const land = projectType === 'L';
  const flagDefs = FLAGS.filter(f => FLAGS_OF[projectType].includes(f.flag));

  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [towerFilter, setTowerFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [query, setQuery] = useState('');
  const [bands, setBands] = useState<Record<Band, boolean>>({ unit: true, vars: true, res: true });
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const isPriced = (up: ProjectUnitPrice) =>
    modelPriced(up) && up.totalAppraisalValueRounded != null;

  const baseById = useMemo(
    () => (preview && baseline ? new Map(baseline.map(b => [b.projectUnitId, b])) : null),
    [preview, baseline],
  );

  const towers = useMemo(
    () => Array.from(new Set(rows.map(r => r.towerName).filter((v): v is string => !!v))).sort(),
    [rows],
  );
  const models = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter(r => !towerFilter || r.towerName === towerFilter)
            .map(r => r.modelType)
            .filter((v): v is string => !!v),
        ),
      ).sort(),
    [rows, towerFilter],
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter(r => {
        if (towerFilter && r.towerName !== towerFilter) return false;
        if (modelFilter && r.modelType !== modelFilter) return false;
        if (!q) return true;
        return [
          r.roomNumber,
          r.towerName,
          r.condoRegistrationNumber,
          r.plotNumber,
          r.houseNumber,
          r.modelType,
        ].some(v => v?.toLowerCase().includes(q));
      }),
    [rows, towerFilter, modelFilter, q],
  );

  const sumOver = (list: ProjectUnitPrice[], field: CalculatedField) =>
    list.reduce((s, r) => (isPriced(r) ? s + (r[field] ?? 0) : s), 0);
  const wholeRounded = useMemo(
    () => sumOver(rows, 'totalAppraisalValueRounded'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, modelPriced],
  );
  // The whole stored total, as the header shows it: units whose model has no standard price are
  // left out of the recompute, so the difference includes losing their stored price.
  const storedRounded = useMemo(
    () => (baseline ?? []).reduce((s, b) => s + (b.totalAppraisalValueRounded ?? 0), 0),
    [baseline],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pageNumber, totalPages - 1);
  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const resetPage = () => setPageNumber(0);

  // The edge fade under the frozen identity columns shows only while content really scrolls beneath them.
  const hasTable = !error && !isLoading && filtered.length > 0;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!hasTable || !el) return;
    const measure = () => {
      setFadeLeft(el.scrollLeft > 1);
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    // The panel folding, the window and the column groups all change the overflow.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    if (el.firstElementChild) observer?.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [hasTable]);

  // ── Cells ──────────────────────────────────────────────────────────────────

  const changed = (r: RowCtx, field: CalculatedField) =>
    !!r.base && !sameFigure(r.up[field], r.base[field]);
  const value = (r: RowCtx, field: CalculatedField) => {
    const v = r.up[field];
    if (v == null) return <Dash />;
    return changed(r, field) ? (
      <span className="rounded bg-(--palette-warn-wash) px-1 ring-1 ring-amber-300 dark:ring-(--palette-warn)/50">
        {fmt(v)}
      </span>
    ) : (
      fmt(v)
    );
  };
  const result = (field: CalculatedField) =>
    function resultCell(r: RowCtx) {
      return r.priced ? value(r, field) : <Dash />;
    };

  const amountOf = (key: AmountKey) => {
    const a = Number(amounts?.[key]);
    return Number.isFinite(a) ? a : 0;
  };
  const flagsFor = (up: ProjectUnitPrice) => flagDefs.filter(f => up[f.flag]);
  const flagFoot = (list: ProjectUnitPrice[]) => {
    const parts = flagDefs
      .map(f => {
        const n = list.filter(r => r[f.flag]).length;
        return n
          ? `${t(f.labelKey)} ${n.toLocaleString()} · ${(n * amountOf(f.amount)).toLocaleString()}`
          : '';
      })
      .filter(Boolean);
    return parts.length ? parts.join(' | ') : <Dash />;
  };

  // The raw flag total, and, when the location method turns it into something else, what it adds
  // to the value (e.g. 200.00 -> 9,500.00 per sq.m.). The method is the one the form shows: the
  // draft while editing, the saved one otherwise.
  const locationMethod = amounts?.locationMethod;
  const adjCell = (r: RowCtx) => {
    if (!r.priced) return <Dash />;
    const raw = value(r, 'adjustPriceLocation');
    const rawAmount = r.up.adjustPriceLocation;
    if (!rawAmount) return raw;
    const contribution = locationContribution(r.up, locationMethod, projectType);
    return sameFigure(contribution, rawAmount) ? (
      raw
    ) : (
      <>
        {raw}
        <span className="ml-1.5 text-xs text-(--palette-ink-2)">→ {fmt(contribution)}</span>
      </>
    );
  };

  const flagsCell = (r: RowCtx) => {
    const lit = flagsFor(r.up);
    if (!flagsEditable) {
      return lit.length ? (
        <span
          role="group"
          aria-label={t('condoUnitsPrice.price.cols.flags')}
          className="inline-flex gap-1"
        >
          {lit.map(f => (
            <span
              key={f.flag}
              title={`${t(f.labelKey)} +${amountOf(f.amount).toLocaleString()}`}
              className="rounded-md border border-primary/30 bg-primary/10 px-1.5 text-xs leading-normal font-medium text-(--palette-accent-ink)"
            >
              {t(f.labelKey)}
            </span>
          ))}
        </span>
      ) : (
        <Dash />
      );
    }
    return (
      <span
        role="group"
        aria-label={t('condoUnitsPrice.price.cols.flags')}
        className="inline-flex gap-1"
      >
        {flagDefs.map(f => {
          const on = r.up[f.flag];
          return (
            <button
              key={f.flag}
              type="button"
              aria-pressed={on}
              aria-label={t(f.labelKey)}
              // The amount lives in the tooltip: the chip is the label only, to keep rows narrow.
              title={`${t(f.labelKey)}${on ? ` +${amountOf(f.amount).toLocaleString()}` : ''}`}
              disabled={locked}
              onClick={() => onToggleFlag(r.up.projectUnitId, f.flag, !on)}
              className={clsx(
                'rounded-md border px-1.5 text-xs leading-normal whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                on
                  ? 'border-primary bg-primary/10 font-medium text-(--palette-accent-ink)'
                  : 'border-(--palette-line-strong) bg-(--palette-surface) text-(--palette-ink-2) hover:border-primary hover:text-primary-700 dark:hover:text-(--palette-accent-ink)',
              )}
            >
              {t(f.labelKey)}
            </button>
          );
        })}
      </span>
    );
  };

  // ── Columns ────────────────────────────────────────────────────────────────

  const sold = t('unitPrice.soldChip');
  const numeric = (v?: number | null) => (v == null ? <Dash /> : fmt(v));

  const modelCol: Col = {
    key: 'model',
    band: 'unit',
    header: t('unitPrice.cols.model'),
    cell: r => r.up.modelType ?? <Dash />,
  };
  const areaCol: Col = {
    key: 'area',
    band: 'unit',
    header: t('unitPrice.cols.usableAreaSqm'),
    right: true,
    cell: r => numeric(r.up.usableArea),
  };
  const priceCol: Col = {
    key: 'price',
    band: 'unit',
    header: t('unitPrice.cols.sellingPrice'),
    right: true,
    cell: r => numeric(r.up.sellingPrice),
    foot: fmt(filtered.reduce((s, r) => s + (r.sellingPrice ?? 0), 0)),
  };
  const houseCol: Col = {
    key: 'house',
    band: 'unit',
    header: t('unitPrice.cols.houseNo'),
    cell: r => r.up.houseNumber ?? <Dash />,
  };
  const landCol: Col = {
    key: 'land',
    band: 'unit',
    header: t('unitPrice.cols.landAreaSqWa'),
    right: true,
    cell: r => numeric(r.up.landArea),
    foot: fmt(filtered.reduce((s, r) => s + (r.landArea ?? 0), 0)),
  };
  // Per unit by type: condo by tower and floor, LB by plot and house, L (land only) by plot only.
  const unitCols: Col[] = condo
    ? [
        {
          key: 'tower',
          band: 'unit',
          header: t('unitPrice.cols.towerName'),
          cell: r => r.up.towerName ?? <Dash />,
        },
        {
          key: 'floor',
          band: 'unit',
          header: t('unitPrice.cols.floor'),
          center: true,
          cell: r => r.up.floor ?? <Dash />,
        },
        {
          key: 'reg',
          band: 'unit',
          header: t('condoUnitsPrice.cols.roomNumber'),
          cell: r => r.up.condoRegistrationNumber ?? <Dash />,
        },
        modelCol,
        areaCol,
        priceCol,
      ]
    : land
      ? [houseCol, landCol, priceCol]
      : [
          houseCol,
          modelCol,
          {
            key: 'floors',
            band: 'unit',
            header: t('unitPrice.cols.numberOfFloors'),
            center: true,
            cell: r => r.up.numberOfFloors ?? <Dash />,
          },
          landCol,
          areaCol,
          priceCol,
        ];

  const stdCol: Col = {
    key: 'std',
    band: 'vars',
    header: t(condo ? 'condoUnitsPrice.price.cols.standardPrice' : 'lbPrice.cols.standardPrice'),
    right: true,
    cell: r =>
      r.modelPriced ? (
        value(r, 'standardPrice')
      ) : (
        <Badge size="sm" tone="yellow" dot={false} className="whitespace-nowrap">
          {t('condoUnitsPrice.price.pendingStandard')}
        </Badge>
      ),
  };
  // The calculated figures a type adds: what the Imported view leaves out (it shows stored values only).
  const sumPriced = (field: CalculatedField) => fmt(sumOver(filtered, field));
  const landDiffCol: Col = {
    key: 'landDiff',
    band: 'vars',
    header: t('unitPrice.cols.landDiffSqWa'),
    right: true,
    cell: result('landAreaDifference'),
    foot: sumPriced('landAreaDifference'),
  };
  const landAmountCol: Col = {
    key: 'landAmount',
    band: 'vars',
    header: t(land ? 'lbPrice.cols.landPrice' : 'unitPrice.cols.landPlusMinus'),
    right: true,
    cell: result('landIncreaseDecreaseAmount'),
    foot: sumPriced('landIncreaseDecreaseAmount'),
  };
  const flagsCol: Col = {
    key: 'flags',
    band: 'vars',
    header: t('condoUnitsPrice.price.cols.flags'),
    cell: flagsCell,
    foot: flagFoot(filtered),
  };
  const adjCol: Col = {
    key: 'adj',
    band: 'vars',
    header: t(condo ? 'unitPrice.cols.adjustPriceLocation' : 'unitPrice.cols.locationAdj'),
    right: true,
    cell: adjCell,
    // The summed contribution: raw per-sq.m. rates do not add up across units.
    foot: fmt(
      filtered.reduce(
        (s, r) => (isPriced(r) ? s + locationContribution(r, locationMethod, projectType) : s),
        0,
      ),
    ),
  };
  const calculatedCols: Col[] = condo
    ? [
        flagsCol,
        adjCol,
        {
          key: 'floorInc',
          band: 'vars',
          header: t('unitPrice.cols.priceIncrementFloor'),
          right: true,
          cell: result('priceIncrementPerFloor'),
        },
      ]
    : land
      ? [landAmountCol, flagsCol, adjCol]
      : [flagsCol, landDiffCol, landAmountCol, adjCol];

  const coverageCol: Col = {
    key: 'coverage',
    band: 'res',
    header: t('condoUnitsPrice.price.cols.fireInsurance'),
    right: true,
    cell: result('coverageAmount'),
    foot: fmt(sumOver(filtered, 'coverageAmount')),
  };

  const columns: Col[] = [
    {
      key: 'seq',
      band: 'id',
      header: t('unitPrice.cols.seqNo'),
      center: true,
      left: 0,
      cell: r => r.up.sequenceNumber,
    },
    {
      key: 'room',
      band: 'id',
      header: t(condo ? 'condoUnitsPrice.cols.unitNo' : 'unitPrice.cols.plotNo'),
      left: 4.4,
      cell: r => (
        <>
          {(condo ? r.up.roomNumber : r.up.plotNumber) ?? <Dash />}
          {r.up.isSold && (
            <Badge size="sm" tone="gray" dot={false} className="ml-1.5 whitespace-nowrap">
              {sold}
            </Badge>
          )}
        </>
      ),
    },
    ...unitCols,
    // L has no model, so no standard price to show or to wait for.
    ...(land ? [] : [stdCol]),
    ...(imported ? [] : calculatedCols),
    {
      key: 'total',
      band: 'res',
      header: t('unitPrice.cols.appraisalValue'),
      right: true,
      cell: result('totalAppraisalValue'),
      foot: fmt(sumOver(filtered, 'totalAppraisalValue')),
    },
    {
      key: 'rounded',
      band: 'res',
      header: t('unitPrice.cols.roundedValue'),
      right: true,
      cell: result('totalAppraisalValueRounded'),
      foot: fmt(sumOver(filtered, 'totalAppraisalValueRounded')),
    },
    {
      key: 'force',
      band: 'res',
      header: t('condoUnitsPrice.price.cols.forceSale'),
      right: true,
      cell: result('forceSellingPrice'),
      foot: fmt(sumOver(filtered, 'forceSellingPrice')),
    },
    // Fire cover is priced per model (a rate per sq.m. of usable area): none without one.
    ...(land ? [] : [coverageCol]),
  ];
  const shown = columns.filter(
    c => c.band === 'id' || (imported && c.band === 'vars') || bands[c.band],
  );

  const stickyStyle = (c: Col) => (c.left !== undefined ? { left: `${c.left}rem` } : undefined);
  const stickyCls = (c: Col) =>
    clsx(
      c.key === 'seq' && 'w-[4.4rem] min-w-[4.4rem] max-w-[4.4rem]',
      c.key === 'room' && 'min-w-[8rem] border-r border-(--palette-line)',
      // The identity block's right edge carries the shadow.
      c.key === 'room' && FADE_AFTER,
    );
  // Header cells stack above the body's sticky cells (z-[1]) and the footer's (z-[2]/[3]).
  const stickyZ = (c: Col) => (c.left !== undefined ? 'z-20' : 'z-10');

  // ── Render ─────────────────────────────────────────────────────────────────

  const delta = wholeRounded - storedRounded;
  const pill = showingImported ? (
    <Badge size="sm" tone="gray" dot={false} className="whitespace-nowrap">
      {t('unitPrice.valuesImported')}
    </Badge>
  ) : preview ? (
    <Badge size="sm" tone="yellow" dot={false} className="whitespace-nowrap">
      {t('unitPrice.valuesPreview')}
    </Badge>
  ) : (
    <Badge size="sm" tone="green" dot={false} className="whitespace-nowrap">
      {t('condoUnitsPrice.price.saved')}
    </Badge>
  );

  // One head row: the source switch and everything that used to be a card of its own. The totals
  // live in the project header and the table's footer row.
  const assumptionsLabel = assumptions
    ? t('condoUnitsPrice.dense.assumptions', {
        priced: assumptions.pricedCount,
        total: assumptions.modelCount,
      })
    : '';
  const focusLabel = t(focus ? 'condoUnitsPrice.dense.collapse' : 'condoUnitsPrice.dense.expand');
  const searchPlaceholder = t(
    condo ? 'condoUnitsPrice.price.searchPlaceholder' : 'lbPrice.searchPlaceholder',
  );
  // Below ~54rem of card width (the card is the `@container`) the secondary buttons keep their
  // icon and drop the word, so the head stays one row at 1024 with the side panels open.
  const head = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {pill}
      {rows.length > 0 && (
        // Gives way first when the card is narrow: the totals row has the count too.
        <span className="hidden text-xs text-(--palette-ink-2) @min-[44rem]:inline">
          {t('unitPrice.totalUnits', { count: rows.length, n: rows.length.toLocaleString() })}
        </span>
      )}
      {sourceSwitch}
      {assumptions && (
        <Button
          variant="outline"
          size="sm"
          aria-expanded={assumptionsOpen}
          aria-label={assumptionsLabel}
          title={assumptionsLabel}
          onClick={() => setAssumptionsOpen(v => !v)}
        >
          <Icon name="layer-group" style="light" />
          {/* The word gives way below the card width; the count and the chevron stay. */}
          <span className="ml-2 hidden @min-[54rem]:inline">{assumptionsLabel}</span>
          <span className="ml-2 @min-[54rem]:hidden">
            {assumptions.pricedCount}/{assumptions.modelCount}
          </span>
          <Icon
            name={assumptionsOpen ? 'chevron-up' : 'chevron-down'}
            style="light"
            className="ml-2"
          />
        </Button>
      )}
      {importControls}
      <Button
        variant="outline"
        size="sm"
        aria-label={focusLabel}
        title={t(
          focus ? 'condoUnitsPrice.dense.collapseTitle' : 'condoUnitsPrice.dense.expandTitle',
        )}
        onClick={() => onFocusChange(!focus)}
      >
        <Icon name={focus ? 'compress' : 'expand'} style="light" />
        <span className="ml-2 hidden @min-[54rem]:inline">{focusLabel}</span>
      </Button>
    </div>
  );

  let body: ReactNode;
  if (error) {
    body = error;
  } else if (isLoading) {
    body = (
      <div className="space-y-2 p-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 animate-pulse rounded bg-(--palette-surface-3)" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="flex flex-col items-center justify-center py-10 text-(--palette-ink-2)">
        <Icon name="calculator" className="mb-2 text-3xl" />
        <p className="text-sm">{t('unitPrice.noUnitsUploaded')}</p>
      </div>
    );
  } else {
    const previewText = `${t('condoUnitsPrice.price.previewNote', {
      delta: `${delta >= 0 ? '+' : ''}${fmt(delta)}`,
    })}${
      noStandardCount > 0
        ? ` ${t('condoUnitsPrice.price.noStandardNote', {
            count: noStandardCount,
            n: noStandardCount.toLocaleString(),
          })}`
        : ''
    }`;
    const switchText = t('condoUnitsPrice.price.switchNote');
    const recalcText =
      recalcCount > 0
        ? `${t('condoUnitsPrice.price.recalcHint', {
            count: recalcCount,
            n: recalcCount.toLocaleString(),
          })}${
            noStandardCount > 0
              ? ` ${t('condoUnitsPrice.price.noStandardHint', {
                  count: noStandardCount,
                  n: noStandardCount.toLocaleString(),
                })}`
              : ''
          }`
        : '';
    body = (
      <>
        {preview === 'edit' && (
          <WarningNote
            className="mx-3.5 mt-2"
            oneLine
            action={
              onReset && (
                <Button variant="outline" size="xs" onClick={onReset}>
                  {t('condoUnitsPrice.price.resetToSaved')}
                </Button>
              )
            }
          >
            {previewText}
          </WarningNote>
        )}
        {preview === 'switch' && (
          <WarningNote className="mx-3.5 mt-2" oneLine>
            {switchText}
          </WarningNote>
        )}
        {!preview && recalcCount > 0 && (
          // One line, cut with an ellipsis; the full text is the tooltip.
          <p className="flex items-center gap-1.5 px-4 pt-2 text-xs text-(--palette-ink-2)">
            <Icon name="circle-info" style="solid" className="shrink-0 text-(--palette-ink-3)" />
            <span className="min-w-0 truncate" title={recalcText}>
              {recalcText}
            </span>
          </p>
        )}

        <div className={TOOLBAR}>
          {towers.length > 1 && (
            <ToolbarDropdown
              label={t('unitPrice.cols.towerName')}
              allLabel={t('unitListing.filter.allTowers')}
              value={towerFilter}
              options={towers.map(tw => ({ value: tw, label: tw }))}
              onChange={v => {
                setTowerFilter(v);
                setModelFilter('');
                resetPage();
              }}
            />
          )}
          {models.length > 1 && (
            <ToolbarDropdown
              label={t('unitPrice.cols.model')}
              allLabel={t('unitListing.filter.allModels')}
              value={modelFilter}
              options={models.map(m => ({ value: m, label: m }))}
              onChange={v => {
                setModelFilter(v);
                resetPage();
              }}
            />
          )}
          <div className="min-w-[9rem] max-w-[16rem] flex-1">
            <TextInput
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                resetPage();
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              leftIcon={<Icon style="regular" name="magnifying-glass" className="size-3.5" />}
            />
          </div>
          <span className="flex-1" />
          <div
            role="group"
            aria-label={t('condoUnitsPrice.price.bands.label')}
            className="flex flex-wrap items-center gap-1.5"
          >
            <span className="text-xs text-(--palette-ink-2)">
              {t('condoUnitsPrice.price.bands.label')}
            </span>
            {(['unit', 'vars', 'res'] as const)
              .filter(b => !(imported && b === 'vars'))
              .map(b => (
                <FilterChip
                  key={b}
                  pressed={bands[b]}
                  onClick={() => setBands(prev => ({ ...prev, [b]: !prev[b] }))}
                >
                  {t(
                    // The group header row is gone, so this is the only place that says the
                    // result columns here come from the file.
                    imported && b === 'res'
                      ? 'condoUnitsPrice.price.bands.resImported'
                      : `condoUnitsPrice.price.bands.${b}`,
                  )}
                </FilterChip>
              ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-(--palette-ink-2)">
            {t('unitListing.noMatch')}
          </p>
        ) : (
          // The card is capped at the scroll area's height (see the pane below), so this is the
          // part that takes whatever is left down to the action bar.
          // (never under about four rows, even when an assumptions table is folded open above)
          <div
            ref={scrollerRef}
            data-fade-left={fadeLeft || undefined}
            className="group/tw min-h-[9rem] flex-1 overflow-auto [--fade:rgba(16,24,40,0.18)] dark:[--fade:rgba(0,0,0,0.55)]"
          >
            <table className={dataTable.table}>
              <thead>
                <tr>
                  {shown.map(c => (
                    <th
                      key={c.key}
                      style={stickyStyle(c)}
                      className={clsx(
                        dataTable.th,
                        // Header z-10, header corner (a frozen identity column) z-20, above the body's sticky
                        // cells at z-[1] (DESIGN.md section 10).
                        'sticky top-0',
                        stickyZ(c),
                        c.right ? 'text-right' : c.center ? 'text-center' : 'text-left',
                        stickyCls(c),
                      )}
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map(up => {
                  const ctx: RowCtx = {
                    up,
                    modelPriced: modelPriced(up),
                    priced: isPriced(up),
                    base: baseById?.get(up.projectUnitId),
                  };
                  return (
                    <tr
                      key={up.projectUnitId}
                      className={up.isSold ? dataRow.sold : dataRow.normal}
                    >
                      {shown.map(c => (
                        <td
                          key={c.key}
                          style={stickyStyle(c)}
                          className={clsx(
                            dataTable.td,
                            'bg-inherit',
                            c.right && 'text-right',
                            c.center && 'text-center',
                            c.left !== undefined && 'sticky z-[1]',
                            stickyCls(c),
                          )}
                        >
                          {c.cell(ctx)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={2}
                    style={{ left: 0 }}
                    className={clsx(dataTable.tf, 'sticky bottom-0 z-[3]')}
                  >
                    {t('unitPrice.total', {
                      count: filtered.length,
                      n: filtered.length.toLocaleString(),
                    })}
                  </td>
                  {shown.slice(2).map(c => (
                    <td
                      key={c.key}
                      style={stickyStyle(c)}
                      className={clsx(
                        dataTable.tf,
                        'sticky bottom-0',
                        'z-[2]',
                        c.right && 'text-right',
                        c.center && 'text-center',
                      )}
                    >
                      {c.foot}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* The pager is `shrink-0`; the table above gives way, so it stays above the action bar. */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={filtered.length}
          pageSize={pageSize}
          pageSizeOptions={[5, 10, 25, 50, 75, 100]}
          onPageChange={setPageNumber}
          onPageSizeChange={size => {
            setPageSize(size);
            resetPage();
          }}
        />
      </>
    );
  }

  return (
    // A card (DESIGN.md section 8) with the compact header, capped at the scroll area (the tab's
    // size container): the body is a flex column, so the table takes what is left down to the
    // action bar. 24rem keeps it usable when the window is very short.
    <FormCard
      title={t('page.tabs.unitPrice')}
      headingClassName="text-base whitespace-nowrap"
      rightIcon={head}
      size="sm"
      noPadding
      className="@container flex max-h-[max(24rem,calc(100cqh-0.5rem))] flex-col"
      bodyClassName="flex min-h-0 flex-1 flex-col"
    >
      {recalcSummary}
      {assumptions && assumptionsOpen && (
        // At most 220px or 35% of the scroll area, never under 6rem.
        <div className="max-h-[max(6rem,min(220px,35cqh))] shrink-0 overflow-auto border-b border-(--palette-line-soft)">
          {assumptions.table}
        </div>
      )}
      {notice}
      {body}
    </FormCard>
  );
}
