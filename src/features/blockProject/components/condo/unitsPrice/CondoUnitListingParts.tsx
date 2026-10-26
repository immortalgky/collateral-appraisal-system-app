import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import Icon from '@/shared/components/Icon';
import Pagination from '@/shared/components/Pagination';
import TextInput from '@/shared/components/inputs/TextInput';
import { formatLocaleDateTime } from '@/shared/utils/dateUtils';
import { formatNumber } from '@/shared/utils/formatUtils';

import type { ProjectType, ProjectUnit } from '../../../types';
import { Dash, FilterChip, ToolbarDropdown, WarningNote } from './look';
import { TOOLBAR, dataRow, dataTable } from './lookClasses';

export type SaleFilter = 'all' | 'available' | 'sold';

// ── Import row ────────────────────────────────────────────────────────────────

interface ImportRowProps {
  readOnly: boolean;
  /** Re-match upload of a reappraisal: nothing is replaced, so no "clears all prices" warning. */
  isReappraisal: boolean;
  uploadBlocked: boolean;
  isUploadBusy: boolean;
  /** The hidden file input; the Button opens it. */
  uploadInput: ReactNode;
  /** Opens the file picker (clicks the input). */
  onChooseFile: () => void;
  /** Latest batch: file name, what it did, when. */
  latest: { fileName: string; outcome: string; uploadedAt: string } | undefined;
  uploadCount: number;
  historyOpen: boolean;
  onToggleHistory: () => void;
  /** The history list, shown inline under the row while open. */
  history: ReactNode;
}

/** Slim import row: button, the last file, an inline history, and the replace warning. */
export function CondoUnitImportRow({
  readOnly,
  isReappraisal,
  uploadBlocked,
  isUploadBusy,
  uploadInput,
  onChooseFile,
  latest,
  uploadCount,
  historyOpen,
  onToggleHistory,
  history,
}: ImportRowProps) {
  const { t, i18n } = useTranslation('blockProject');

  return (
    <Card noPadding>
      <div className="grid gap-2.5 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {!readOnly && (
            <>
              {/* The Button is the tab stop and the keyboard target (Enter / Space click it); it
                  opens the hidden file input. */}
              <Button
                size="sm"
                onClick={onChooseFile}
                disabled={uploadBlocked}
                leftIcon={<Icon style="regular" name="file-arrow-up" />}
              >
                {isUploadBusy
                  ? t('unitListing.uploading')
                  : t(isReappraisal ? 'unitListing.reappraisal.action' : 'unitListing.importUnits')}
              </Button>
              {uploadInput}
            </>
          )}

          {latest ? (
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-(--palette-ink-2)">
              <span>{t('unitListing.lastUpload')}</span>
              <span
                className="max-w-[16rem] truncate font-medium text-(--palette-ink)"
                title={latest.fileName}
              >
                {latest.fileName}
              </span>
              <span>· {latest.outcome}</span>
              <span className="text-(--palette-ink-2)">
                · {formatLocaleDateTime(latest.uploadedAt, i18n.language)}
              </span>
            </p>
          ) : (
            <p className="text-xs text-(--palette-ink-2)">{t('unitListing.noUploadHistory')}</p>
          )}

          <div className="flex-1" />

          {uploadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleHistory}
              aria-expanded={historyOpen}
              leftIcon={<Icon name="clock-rotate-left" style="solid" />}
            >
              {historyOpen
                ? t('unitListing.hideHistory')
                : t('unitListing.showHistory', { count: uploadCount })}
            </Button>
          )}
        </div>

        {historyOpen && (
          <div className="overflow-hidden rounded-lg border border-(--palette-line)">{history}</div>
        )}

        {!readOnly &&
          (isReappraisal ? (
            <p className="text-xs text-(--palette-ink-2)">{t('unitListing.reappraisal.hint')}</p>
          ) : (
            <WarningNote>{t('condoUnitsPrice.listing.replaceNote')}</WarningNote>
          ))}
      </div>
    </Card>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

interface FiltersProps {
  /** Condo (default), Land and Building or L (land only): which filters the toolbar offers. */
  projectType?: ProjectType;
  saleFilter: SaleFilter;
  saleCounts: Record<SaleFilter, number>;
  onSaleFilter: (key: SaleFilter) => void;
  towers: { name: string; count: number }[];
  towerFilter: string;
  towerAllCount: number;
  onTowerFilter: (value: string) => void;
  /** Condo: the model select. Land and Building: the chip row under the toolbar. */
  modelOptions: string[];
  /** Land and Building only: one chip per model, counted within every other filter. */
  models?: { name: string; count: number }[];
  modelAllCount?: number;
  modelFilter: string;
  onModelFilter: (value: string) => void;
  floorOptions: number[];
  floorFilter: string;
  onFloorFilter: (value: string) => void;
  query: string;
  onQuery: (value: string) => void;
  shown: number;
  total: number;
}

/** A labelled row of choice chips: "All" and one chip per group. Shown for two or more groups. */
function ChipRow({
  label,
  groups,
  allCount,
  value,
  onChange,
}: {
  label: string;
  groups: { name: string; count: number }[];
  allCount: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('blockProject');
  if (groups.length < 2) return null;

  return (
    <div className={clsx(TOOLBAR, 'py-1.5')}>
      <span className="text-xs text-(--palette-ink-2)">{label}</span>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        <FilterChip pressed={!value} count={allCount} onClick={() => onChange('')}>
          {t('unitListing.filter.all')}
        </FilterChip>
        {groups.map(g => (
          <FilterChip
            key={g.name}
            pressed={value === g.name}
            count={g.count}
            onClick={() => onChange(g.name)}
          >
            {g.name}
          </FilterChip>
        ))}
      </div>
      <span className="text-xs text-(--palette-ink-2)">
        {t('condoUnitsPrice.listing.filterHint')}
      </span>
    </div>
  );
}

/**
 * Status chips and search; Condo adds the model + floor selects and the tower chips, Land and
 * Building the model chips. L (land only) has no model, tower or floor to filter by.
 */
export function CondoUnitFilters({ projectType = 'U', ...p }: FiltersProps) {
  const { t } = useTranslation('blockProject');
  const condo = projectType === 'U';
  const searchPlaceholder = t(
    condo ? 'condoUnitsPrice.listing.searchPlaceholder' : 'lbLists.units.searchPlaceholder',
  );

  return (
    <>
      <div className={TOOLBAR}>
        <div
          role="group"
          aria-label={t('unitListing.cols.saleStatus')}
          className="flex flex-wrap gap-1.5"
        >
          {(['all', 'available', 'sold'] as const).map(key => (
            <FilterChip
              key={key}
              pressed={p.saleFilter === key}
              count={p.saleCounts[key]}
              onClick={() => p.onSaleFilter(key)}
            >
              {t(`unitListing.filter.${key}`)}
            </FilterChip>
          ))}
        </div>

        {condo && p.modelOptions.length > 1 && (
          <ToolbarDropdown
            label={t('unitListing.cols.modelType')}
            allLabel={t('unitListing.filter.allModels')}
            value={p.modelFilter}
            options={p.modelOptions.map(m => ({ value: m, label: m }))}
            onChange={p.onModelFilter}
          />
        )}

        {condo && p.floorOptions.length > 1 && (
          <ToolbarDropdown
            label={t('unitListing.cols.floor')}
            allLabel={t('condoUnitsPrice.listing.allFloors')}
            value={p.floorFilter}
            options={p.floorOptions.map(f => ({ value: String(f), label: String(f) }))}
            onChange={p.onFloorFilter}
            className="w-32"
          />
        )}

        <div className="min-w-[12rem] max-w-xs flex-1">
          <TextInput
            value={p.query}
            onChange={e => p.onQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            leftIcon={<Icon style="regular" name="magnifying-glass" className="size-3.5" />}
          />
        </div>

        <span className="flex-1" />
        {p.shown !== p.total && (
          <span className="text-xs text-(--palette-ink-2) tabular-nums">
            {t('unitListing.shownOf', { shown: p.shown, total: p.total })}
          </span>
        )}
      </div>

      {condo ? (
        <ChipRow
          label={t('unitListing.cols.towerName')}
          groups={p.towers}
          allCount={p.towerAllCount}
          value={p.towerFilter}
          onChange={p.onTowerFilter}
        />
      ) : projectType === 'LB' ? (
        <ChipRow
          label={t('unitListing.cols.modelName')}
          groups={p.models ?? []}
          allCount={p.modelAllCount ?? 0}
          value={p.modelFilter}
          onChange={p.onModelFilter}
        />
      ) : null}
    </>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

type ColKey =
  | 'sqNo'
  | 'floor'
  | 'tower'
  | 'registration'
  | 'roomNo'
  | 'plot'
  | 'house'
  | 'status'
  | 'model'
  | 'numFloors'
  | 'land'
  | 'usable'
  | 'price';

/**
 * The columns of each project type, in order. Condo is tower and room; a village is plots and
 * houses; L is appraised as land only, so no model, building or floor, only the plot, its land
 * and its price.
 * The columns from the first measure on ('land', 'usable', 'price') are summed in the totals row.
 */
const UNIT_COLUMNS: Record<ProjectType, ColKey[]> = {
  U: ['sqNo', 'floor', 'tower', 'registration', 'roomNo', 'status', 'model', 'usable', 'price'],
  LB: ['sqNo', 'plot', 'house', 'status', 'model', 'numFloors', 'land', 'usable', 'price'],
  L: ['sqNo', 'plot', 'house', 'status', 'land', 'price'],
};

const CENTERED: ColKey[] = ['sqNo', 'floor', 'numFloors'];
const MEASURES: ColKey[] = ['land', 'usable', 'price'];

interface TableProps {
  /** Condo (default), Land and Building or L (land only): which columns the table has. */
  projectType?: ProjectType;
  /** This page's rows. */
  units: ProjectUnit[];
  /** Every unit the filters let through: the totals row sums these, not just the page. */
  filteredCount: number;
  /** Land and Building / Land: the plots' land area in sq.wa. */
  totalLand?: number;
  totalArea: number;
  totalPrice: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

/** Sticky-header unit table; sold rows muted with a pill; a totals row for the filtered set. */
export function CondoUnitTable({
  projectType = 'U',
  units,
  filteredCount,
  totalLand = 0,
  totalArea,
  totalPrice,
  pageNumber,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: TableProps) {
  const { t } = useTranslation('blockProject');
  const th = (align: 'left' | 'center' | 'right') =>
    clsx(
      dataTable.th,
      'sticky top-0 z-10',
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
    );
  const td = (align: 'left' | 'center' | 'right' = 'left') =>
    clsx(
      dataTable.td,
      'bg-inherit',
      align === 'right' && 'text-right tabular-nums',
      align === 'center' && 'text-center',
    );
  const tf = (align: 'left' | 'right' = 'left') =>
    clsx(dataTable.tf, 'sticky bottom-0 z-[2]', align === 'right' && 'text-right tabular-nums');
  // Floors are whole numbers; area and price show two decimals.
  const num = (v?: number | null, decimals = 0) =>
    v == null ? <Dash /> : formatNumber(v, decimals);

  const columns = UNIT_COLUMNS[projectType];
  const align = (c: ColKey): 'left' | 'center' | 'right' =>
    CENTERED.includes(c) ? 'center' : MEASURES.includes(c) ? 'right' : 'left';
  const header: Record<ColKey, string> = {
    sqNo: t('unitListing.cols.sqNo'),
    floor: t('unitListing.cols.floor'),
    tower: t('unitListing.cols.towerName'),
    registration: t('condoUnitsPrice.cols.roomNumber'),
    roomNo: t('condoUnitsPrice.cols.unitNo'),
    plot: t('unitListing.cols.plotNo'),
    house: t('unitListing.cols.houseNo'),
    status: t('unitListing.cols.saleStatus'),
    model: t(projectType === 'U' ? 'unitListing.cols.modelType' : 'unitListing.cols.modelName'),
    numFloors: t('unitListing.cols.numFloors'),
    land: t('unitListing.cols.landAreaSqWa'),
    usable: t('unitListing.cols.usableAreaSqm'),
    price: t('unitListing.cols.sellingPriceBaht'),
  };
  const cell = (c: ColKey, unit: ProjectUnit): ReactNode => {
    switch (c) {
      case 'sqNo':
        return unit.sequenceNumber;
      case 'floor':
        return num(unit.floor);
      case 'tower':
        return unit.towerName ?? <Dash />;
      case 'registration':
        return unit.condoRegistrationNumber ?? <Dash />;
      case 'roomNo':
        return unit.roomNumber ?? <Dash />;
      case 'plot':
        return unit.plotNumber ?? <Dash />;
      case 'house':
        return unit.houseNumber ?? <Dash />;
      case 'status':
        return unit.isSold ? (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {t('unitListing.saleStatus.sold')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-(--palette-ink-2)">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {t('unitListing.saleStatus.available')}
          </span>
        );
      case 'model':
        return unit.modelType ?? <Dash />;
      case 'numFloors':
        return unit.numberOfFloors ?? <Dash />;
      case 'land':
        return num(unit.landArea, 2);
      case 'usable':
        return num(unit.usableArea, 2);
      case 'price':
        return num(unit.sellingPrice, 2);
    }
  };
  const total: Partial<Record<ColKey, number>> = {
    land: totalLand,
    usable: totalArea,
    price: totalPrice,
  };
  // The label spans every column before the first measure.
  const labelSpan = columns.findIndex(c => MEASURES.includes(c));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className={dataTable.table}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c} className={th(align(c))}>
                  {header[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {units.map(unit => (
              <tr key={unit.id} className={unit.isSold ? dataRow.sold : dataRow.normal}>
                {columns.map(c => (
                  <td key={c} className={td(align(c))}>
                    {cell(c, unit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={labelSpan} className={tf()}>
                {t('condoUnitsPrice.listing.totalFiltered', {
                  count: filteredCount,
                  n: filteredCount.toLocaleString(),
                })}
              </td>
              {columns.slice(labelSpan).map(c => (
                <td key={c} className={tf('right')}>
                  {formatNumber(total[c] ?? 0, 2)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <Pagination
        currentPage={pageNumber}
        totalPages={totalPages}
        totalCount={filteredCount}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 25, 50, 75, 100]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
