import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { z } from 'zod';
import NumberInput from '@shared/components/inputs/NumberInput';
import Icon from '@shared/components/Icon';
import {
  FormTableCell,
  FormTableFrame,
  FormTableHead,
  FormTableRow,
  FormTableRowActions,
  useFormLayout,
  type FormTableColumn,
} from '@/shared/components/form';
import { schemas } from '@shared/schemas/v1';
import {
  baht,
  isPendingProgress,
  isRegressedProgress,
  pct,
  RO,
  sumWork,
  type ComputedItem,
  type RowFigures,
  type WorkTotals,
} from './constructionGrid';
import type { proportionStatus } from '../../utils/constructionMoney';
import {
  Change,
  CurrentValueCell,
  HeadLabel,
  type CurrentValueOverride,
} from './constructionGridCells';

type ConstructionWorkGroupDto = z.infer<typeof schemas.ConstructionWorkGroupDto>;
type ConstructionWorkItemDto = ConstructionWorkGroupDto['items'][number];

interface ConstructionDetailTableProps {
  workGroups: ConstructionWorkGroupDto[];
  computedSubItems: ComputedItem[];
  /** The whole building's totals and split status, already computed by the tab. */
  totals: WorkTotals;
  split: ReturnType<typeof proportionStatus>;
  /** While the master list loads its rows have nowhere to go yet; afterwards orphans get "Other". */
  workGroupsLoading: boolean;
  /** The master list failed to load: rows fall under "Other" and nothing can be added. */
  workGroupsFailed: boolean;
  /** Progressive round: previous-round columns carry real history and are shown. */
  showPrevious: boolean;
  /** Construction Value, Curr. Share and Prev. Value — derived, so hidden unless asked for. */
  showCalculated: boolean;
  /** False without a value base of its own (a condo, or a house without its building cost). */
  showMoney: boolean;
  /** The building-total row's value, typed in place of the calculated sum. */
  override?: CurrentValueOverride;
  /** A null item id is a name the appraiser typed, outside the master list. */
  onAddSubItem: (
    constructionWorkGroupId: string,
    constructionWorkItemId: string | null,
    workItemName: string,
  ) => void;
  onUpdateSubItem: (index: number, field: string, value: number) => void;
  onDeleteSubItem: (index: number) => void;
  readOnly?: boolean;
}

const OTHER_GROUP = '__other';

/** Column widths in rem: the work-item name (flexible, this is its minimum), the figures, the row actions. */
const NAME_W = 13.7143;
/** An input column is the mock's 92px input plus the cell's 8px on each side. */
const FIGURE_W = 7.7143;
const PREVIOUS_W = 6.2857;
const CHANGE_W = 5.7143;
/** The value column: 124px, room for "999,999,999" and the reset icon in the total row. */
const VALUE_W = 10;
/** The calculated columns ("show calculated"). */
const CALC_W = 6.8571;
const ACTIONS_W = 3.4286;
/** Longest name the server stores for a work item. */
const NAME_MAX = 200;

/** Row heights of the mock, per layout. Cells' own padding and `h-ctl` give way to these. */
const ROW = {
  standard: {
    head: '[&_thead_th]:h-[2.8571rem] [&_thead_th]:py-0',
    group: '[&>td]:h-[2.8571rem] [&>td]:py-0',
    item: '[&>td]:h-[3.1429rem] [&>td]:py-0',
    total: '[&>td]:h-[3.4286rem] [&>td]:py-0',
    quick: '',
  },
  compact: {
    head: '[&_thead_th]:h-[2.2857rem] [&_thead_th]:py-0',
    group: '[&>td]:h-[2.2857rem] [&>td]:py-0',
    item: '[&>td]:h-[2.5714rem] [&>td]:py-0',
    total: '[&>td]:h-[2.7143rem] [&>td]:py-0',
    quick: '[&>td]:h-[2.4286rem] [&>td]:py-0',
  },
} as const;

/**
 * The group's quick-add row: one chip per master work item it does not hold yet, and "Other" for a
 * name typed by hand. Chips rather than a menu so that adding is one click and what is left is visible.
 */
export function QuickAddRow({
  items,
  itemLabel,
  colSpan,
  onPick,
  onPickCustom,
}: {
  items: ConstructionWorkItemDto[];
  itemLabel: (item: ConstructionWorkItemDto) => string;
  colSpan: number;
  onPick: (item: ConstructionWorkItemDto) => void;
  onPickCustom: (name: string) => void;
}) {
  const { t } = useTranslation('appraisal');
  const standard = useFormLayout() === 'standard';
  const [typing, setTyping] = useState(false);
  // Stable, so typing does not pull focus back on every render.
  const focusOnMount = useCallback((el: HTMLInputElement | null) => el?.focus(), []);
  const [name, setName] = useState('');
  const chip = clsx(
    'inline-flex items-center gap-1 rounded-full border bg-(--palette-surface) text-xs',
    standard ? 'h-[2rem] px-[0.6429rem]' : 'h-[1.8571rem] px-[0.5714rem]',
  );
  const dashed =
    'border-dashed border-(--palette-line-strong) text-(--palette-ink) hover:border-solid hover:border-(--palette-accent-ink) hover:bg-(--palette-accent-wash) hover:text-(--palette-accent-ink)';
  const plus = (
    <Icon name="plus" style="solid" className="text-[0.8571rem] text-(--palette-accent-ink)" />
  );
  // Only Enter adds and Escape cancels. Leaving the field never adds: it would move the layout
  // under a click in progress, and a half-typed name is not an answer.
  const finish = (add: boolean) => {
    const typed = name.trim();
    setTyping(false);
    setName('');
    if (add && typed) onPickCustom(typed);
  };
  return (
    <FormTableRow className={ROW[standard ? 'standard' : 'compact'].quick}>
      <FormTableCell colSpan={colSpan}>
        <div
          className={clsx(
            'flex flex-wrap items-center gap-1.5',
            standard ? 'pl-[3.25rem]' : 'pl-[2.857rem]',
          )}
        >
          <span className="mr-0.5 text-xs text-(--palette-ink-2)">
            {t('constructionInspection.grid.quickAdd')}
          </span>
          {items.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item)}
              className={clsx(chip, dashed)}
            >
              {plus}
              {itemLabel(item)}
            </button>
          ))}
          {typing ? (
            <input
              ref={focusOnMount}
              maxLength={NAME_MAX}
              value={name}
              placeholder={t('constructionInspection.grid.customNamePlaceholder')}
              onChange={e => setName(e.target.value)}
              // Enter would submit the whole property form.
              onKeyDown={e => {
                // Enter that confirms an IME composition is not ours.
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!e.nativeEvent.isComposing) finish(true);
                } else if (e.key === 'Escape') finish(false);
              }}
              onBlur={() => !name.trim() && finish(false)}
              aria-label={t('constructionInspection.grid.addOther')}
              className={clsx(chip, 'w-[12rem] border-(--palette-line-strong)')}
            />
          ) : (
            <button
              type="button"
              onClick={() => setTyping(true)}
              className={clsx(
                chip,
                'border-(--palette-line) text-(--palette-ink-2) hover:border-(--palette-accent-ink) hover:text-(--palette-accent-ink)',
              )}
            >
              {plus}
              {t('constructionInspection.grid.addOther')}
            </button>
          )}
        </div>
      </FormTableCell>
    </FormTableRow>
  );
}

export function ConstructionDetailTable({
  workGroups,
  computedSubItems,
  totals: total,
  split,
  workGroupsLoading,
  workGroupsFailed,
  showPrevious,
  showCalculated,
  showMoney,
  override,
  onAddSubItem,
  onUpdateSubItem,
  onDeleteSubItem,
  readOnly,
}: ConstructionDetailTableProps) {
  const { t, i18n } = useTranslation('appraisal');
  const standard = useFormLayout() === 'standard';
  const rows = ROW[standard ? 'standard' : 'compact'];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [focusRow, setFocusRow] = useState<number | null>(null);

  // A freshly added item puts the cursor in its proportion cell, the one thing it still needs.
  // The row arrives a render after append() (through useWatch), so wait until it exists.
  useEffect(() => {
    if (focusRow == null) return;
    const input = document.querySelector<HTMLInputElement>(
      `[data-ci-col="proportionPct"][data-ci-row="${focusRow}"]`,
    );
    if (!input) {
      // The rows moved on without it (copied over, or the page turned read-only): give up rather
      // than pull focus into whichever row lands on this index later.
      if (computedSubItems.length > focusRow) setFocusRow(null);
      return;
    }
    input.focus();
    setFocusRow(null);
  }, [focusRow, computedSubItems.length]);

  const isThai = i18n.language?.startsWith('th');
  const masterItems = useMemo(
    () => new Map(workGroups.flatMap(g => g.items).map(i => [i.id, i])),
    [workGroups],
  );
  // One language only: the master's Thai name on a Thai screen, English otherwise.
  const itemName = (item: ComputedItem) => {
    const m = item.constructionWorkItemId ? masterItems.get(item.constructionWorkItemId) : null;
    return m ? (isThai ? m.nameTh : m.nameEn) : item.workItemName;
  };

  // Read-only: no "not entered yet" prompts, changes printed as they stand (see constructionGrid).
  const final = !!readOnly;
  const isRegressed = (i: ComputedItem) =>
    isRegressedProgress(i.previousProgressPct, i.currentProgressPct, showPrevious);
  const regressed = computedSubItems.filter(isRegressed);
  const isPending = (i: ComputedItem) =>
    isPendingProgress(i.previousProgressPct, i.currentProgressPct, showPrevious, final);
  const pending = computedSubItems.filter(isPending);

  // A row whose group is not in the master list (deactivated, or prefilled without one) still
  // counts in every total, so it gets a group of its own where it can be seen and removed.
  const orphans = useMemo(() => {
    const known = new Set(workGroups.map(g => g.id));
    return computedSubItems.filter(i => !known.has(i.constructionWorkGroupId));
  }, [workGroups, computedSubItems]);
  const groups: ConstructionWorkGroupDto[] =
    orphans.length > 0 && !workGroupsLoading
      ? [
          ...workGroups,
          {
            id: OTHER_GROUP,
            code: OTHER_GROUP,
            nameTh: t('constructionInspection.grid.otherGroup'),
            nameEn: t('constructionInspection.grid.otherGroup'),
            displayOrder: Number.MAX_SAFE_INTEGER,
            items: [],
          },
        ]
      : workGroups;

  // ↑ / ↓ / Enter move within the same column, spreadsheet-style.
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' || e.key === 'Enter' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    const all = Array.from(
      el
        .closest('table')
        ?.querySelectorAll<HTMLInputElement>(`input[data-ci-col="${el.dataset.ciCol}"]`) ?? [],
    );
    all[all.indexOf(el) + step]?.focus();
  };

  const figureColumn = (
    key: string,
    label: string,
    unit: string,
    width = FIGURE_W,
  ): FormTableColumn<ComputedItem> => ({
    key,
    align: 'end',
    width: `${width}rem`,
    header: <HeadLabel label={label} unit={unit} />,
  });
  // The one list of visible columns: the head renders it, and the group band spans it.
  const columns = [
    // No width: the name takes what the figure columns leave.
    { key: 'name', header: t('constructionInspection.grid.workItem') },
    figureColumn(
      'proportion',
      t('constructionInspection.grid.proportion'),
      t('constructionInspection.grid.ofBuilding'),
    ),
    showCalculated &&
      showMoney &&
      figureColumn(
        'constructionValue',
        t('constructionInspection.grid.constructionValue'),
        t('constructionInspection.grid.baht'),
        CALC_W,
      ),
    showPrevious &&
      figureColumn(
        'previousProgress',
        t('constructionInspection.grid.previousProgress'),
        '(%)',
        PREVIOUS_W,
      ),
    figureColumn('currentProgress', t('constructionInspection.grid.currentProgress'), '(%)'),
    showPrevious && figureColumn('change', t('constructionInspection.grid.change'), '', CHANGE_W),
    showCalculated &&
      figureColumn(
        'currentShare',
        t('constructionInspection.grid.currentShare'),
        t('constructionInspection.grid.ofBuilding'),
        CALC_W,
      ),
    showCalculated &&
      showPrevious &&
      showMoney &&
      figureColumn(
        'previousValue',
        t('constructionInspection.grid.previousValue'),
        t('constructionInspection.grid.baht'),
        CALC_W,
      ),
    showMoney &&
      figureColumn(
        'currentValue',
        t('constructionInspection.grid.currentValue'),
        t('constructionInspection.grid.baht'),
        VALUE_W,
      ),
    !readOnly && { key: 'actions', kind: 'action' as const, width: `${ACTIONS_W}rem` },
  ].filter((c): c is FormTableColumn<ComputedItem> => !!c);
  const fullSpan = columns.length;
  const minWidth = columns.reduce((sum, c) => sum + (parseFloat(c.width ?? '') || NAME_W), 0);

  const pctInput = (item: ComputedItem, field: 'proportionPct' | 'currentProgressPct') => {
    const value = item[field];
    const regressedCell = field === 'currentProgressPct' && isRegressed(item);
    if (readOnly)
      return (
        <FormTableCell align="end" className={clsx(regressedCell && 'text-(--palette-danger)')}>
          {pct(value)}
        </FormTableCell>
      );
    return (
      <FormTableCell kind="input" align="end">
        <NumberInput
          cell
          value={value}
          onChange={e => onUpdateSubItem(item._index, field, e.target.value ?? 0)}
          decimalPlaces={2}
          max={100}
          data-ci-col={field}
          data-ci-row={item._index}
          onKeyDown={handleKeyDown}
          aria-label={`${itemName(item)} ${field === 'proportionPct' ? t('constructionInspection.grid.proportion') : t('constructionInspection.grid.currentProgress')}`}
          invalid={regressedCell}
          className={standard ? 'h-ctl-c!' : undefined}
        />
      </FormTableCell>
    );
  };

  /** The figure columns shared by the item, group and building rows. */
  const figures = (
    f: RowFigures,
    cells: { proportion: ReactNode; current: ReactNode; value?: ReactNode },
    /** `incomplete`: a total over rows still being entered. `shareIsProgress`: the building row,
     *  whose progress already is the share — printed once, not twice. */
    opts: { incomplete?: boolean; shareIsProgress?: boolean } = {},
  ) => (
    <>
      {cells.proportion}
      {showCalculated && showMoney && (
        <FormTableCell align="end">{baht(f.constructionValue)}</FormTableCell>
      )}
      {showPrevious && (
        <FormTableCell align="end" className={RO}>
          {pct(f.previousProgress)}
        </FormTableCell>
      )}
      {cells.current}
      {showPrevious && (
        <FormTableCell align="end">
          <Change
            from={f.previousProgress}
            to={f.currentProgress}
            final={final}
            incomplete={opts.incomplete}
          />
        </FormTableCell>
      )}
      {showCalculated && (
        <FormTableCell align="end">{opts.shareIsProgress ? '' : pct(f.currentShare)}</FormTableCell>
      )}
      {showCalculated && showPrevious && showMoney && (
        <FormTableCell align="end" className={RO}>
          {baht(f.previousValue)}
        </FormTableCell>
      )}
      {showMoney &&
        (cells.value ?? <FormTableCell align="end">{baht(f.currentValue)}</FormTableCell>)}
    </>
  );

  const totalRow = (
    label: ReactNode,
    f: WorkTotals,
    rowClass: string,
    opts: { incomplete: boolean; shareIsProgress?: boolean; blank?: boolean },
    proportionClass = '',
    value?: ReactNode,
  ) => (
    <FormTableRow className={rowClass}>
      <FormTableCell frozen="first" className="bg-inherit!">
        {label}
      </FormTableCell>
      {opts.blank ? (
        // An empty group has no figures to total: 0.00 everywhere would read as a result.
        <FormTableCell colSpan={fullSpan - 1} />
      ) : (
        <>
          {figures(
            f,
            {
              proportion: (
                <FormTableCell align="end" className={proportionClass}>
                  {pct(f.proportion)}
                </FormTableCell>
              ),
              current: <FormTableCell align="end">{pct(f.currentProgress)}</FormTableCell>,
              value,
            },
            opts,
          )}
          {!readOnly && <FormTableCell />}
        </>
      )}
    </FormTableRow>
  );

  return (
    <div>
      <FormTableFrame minWidth={minWidth} bleed className={clsx('table-fixed', rows.head)}>
        <colgroup>
          {columns.map(c => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <FormTableHead columns={columns} frozen={i => (i === 0 ? 'first' : undefined)} />
        <tbody>
          {groups.map(group => {
            const items =
              group.id === OTHER_GROUP
                ? orphans
                : computedSubItems.filter(i => i.constructionWorkGroupId === group.id);
            if (readOnly && items.length === 0) return null;
            const taken = new Set(items.map(i => i.constructionWorkItemId));
            const available = group.items.filter(i => !taken.has(i.id));
            const isCollapsed = collapsed[group.id] && items.length > 0;
            const groupTotals = sumWork(items);
            const groupName = isThai ? group.nameTh : group.nameEn;

            return (
              <Fragment key={group.id}>
                {/* The group's own totals, in the columns the rows below fill in: its progress is
                    the proportion-weighted progress of its items, like theirs. */}
                {totalRow(
                  <div className="flex min-w-0 items-center gap-x-2">
                    <button
                      type="button"
                      onClick={() => setCollapsed(c => ({ ...c, [group.id]: !c[group.id] }))}
                      aria-expanded={!isCollapsed}
                      aria-label={groupName}
                      className="inline-flex size-[1.5714rem] shrink-0 items-center justify-center rounded-[0.3571rem] text-(--palette-ink-2) hover:bg-(--palette-surface-3)"
                    >
                      <Icon
                        name="chevron-down"
                        style="solid"
                        className={clsx(
                          'text-[0.7143rem] transition-transform',
                          isCollapsed && '-rotate-90',
                        )}
                      />
                    </button>
                    <span className="min-w-0 truncate font-semibold" title={groupName}>
                      {groupName}
                    </span>
                    <small className="shrink-0 whitespace-nowrap text-xs font-normal text-(--palette-ink-2)">
                      {t('constructionInspection.grid.itemCount', { count: items.length })}
                    </small>
                  </div>,
                  groupTotals,
                  clsx('bg-(--palette-surface-2) font-semibold', rows.group),
                  { incomplete: items.some(isPending), blank: items.length === 0 },
                )}

                {!isCollapsed &&
                  items.map(item => {
                    const name = itemName(item);
                    return (
                      <FormTableRow key={item._key} className={rows.item}>
                        <FormTableCell
                          frozen="first"
                          className="max-w-[20rem] truncate pl-[3.25rem]!"
                        >
                          <span title={name}>{name}</span>
                        </FormTableCell>
                        {figures(
                          {
                            constructionValue: item.constructionValue,
                            currentShare: item.currentProportionPct,
                            previousProgress: item.previousProgressPct,
                            currentProgress: item.currentProgressPct,
                            previousValue: item.previousPropertyValue,
                            currentValue: item.currentPropertyValue,
                          },
                          {
                            proportion: pctInput(item, 'proportionPct'),
                            current: pctInput(item, 'currentProgressPct'),
                          },
                        )}
                        {!readOnly && (
                          <FormTableCell kind="action">
                            {/* Two clicks instead of a modal: the first arms the button. */}
                            <FormTableRowActions
                              position={item._index}
                              count={computedSubItems.length}
                              onDelete={() => onDeleteSubItem(item._index)}
                              deleteLabel={t('constructionInspection.grid.remove', { name })}
                            />
                          </FormTableCell>
                        )}
                      </FormTableRow>
                    );
                  })}

                {!isCollapsed && !readOnly && group.id !== OTHER_GROUP && (
                  <QuickAddRow
                    items={available}
                    itemLabel={i => (isThai ? i.nameTh : i.nameEn)}
                    colSpan={fullSpan}
                    onPick={picked => {
                      setFocusRow(computedSubItems.length);
                      onAddSubItem(group.id, picked.id, picked.nameEn);
                    }}
                    onPickCustom={typed => {
                      setFocusRow(computedSubItems.length);
                      onAddSubItem(group.id, null, typed);
                    }}
                  />
                )}
              </Fragment>
            );
          })}

          {/* Progress here is the share of the whole building (Σ proportion × progress / 100) — the
              toolbar's figure and the server's. The group rows above show their items' own
              proportion-weighted progress; the two agree once the split reaches 100%. */}
          {computedSubItems.length > 0 &&
            totalRow(
              t('constructionInspection.grid.buildingTotal'),
              {
                ...total,
                previousProgress: total.previousShare,
                currentProgress: total.currentShare,
              },
              clsx(
                'bg-(--palette-surface-2) font-bold text-(--palette-ink) [&>td]:border-t [&>td]:border-t-(--palette-line-strong)',
                rows.total,
              ),
              { incomplete: pending.length > 0, shareIsProgress: true },
              split === 'over'
                ? 'text-(--palette-danger)'
                : split === 'short'
                  ? 'text-(--palette-warn)'
                  : '',
              <FormTableCell kind={override && !readOnly ? 'input' : 'text'} align="end">
                <CurrentValueCell
                  calculated={total.currentValue}
                  override={override}
                  readOnly={readOnly}
                  ariaLabel={t('constructionInspection.grid.currentValue')}
                  onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                />
              </FormTableCell>,
            )}
        </tbody>
      </FormTableFrame>

      {workGroupsLoading && computedSubItems.length > 0 && (
        <div className="border-t border-t-(--palette-line) px-3 py-1.5 text-xs text-(--palette-ink-3)">
          {t('constructionInspection.grid.workGroupsLoading')}
        </div>
      )}
      {workGroupsFailed && (
        <div className="border-t border-t-(--palette-line) px-3 py-1.5 text-xs text-(--palette-danger)">
          {t('constructionInspection.grid.workGroupsFailed')}
        </div>
      )}
      {computedSubItems.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-(--palette-ink-3)">
          {readOnly
            ? t('constructionInspection.grid.emptyReadOnly')
            : t('constructionInspection.grid.empty')}
        </div>
      )}

      {!readOnly && (
        <div className="flex min-h-8 flex-wrap items-center gap-x-3.5 gap-y-0.5 border-t border-t-(--palette-line) bg-(--palette-surface-2) px-3 py-1 text-xs text-(--palette-ink-3)">
          {split === 'over' && (
            <span className="font-medium text-(--palette-danger)">
              {t('constructionInspection.status.overBlocksSave', { pct: pct(total.proportion) })}
            </span>
          )}
          {pending.length > 0 && (
            <span className="text-(--palette-warn)">
              {t('constructionInspection.status.pending', {
                count: pending.length,
                // A new round starts with every row pending: name a few, count the rest.
                names:
                  pending
                    .slice(0, 3)
                    .map(i => itemName(i))
                    .join(', ') + (pending.length > 3 ? ` +${pending.length - 3}` : ''),
              })}
            </span>
          )}
          {regressed.length > 0 && (
            <span className="text-(--palette-danger)">
              ⚠{' '}
              {t('constructionInspection.status.regressed', {
                count: regressed.length,
                names: regressed.map(i => itemName(i)).join(', '),
              })}
            </span>
          )}
          {showPrevious && computedSubItems.some(i => i.previousProgressPct > 0) && (
            <span>
              {/* The previous value it mentions is a calculated column. */}
              {showMoney && showCalculated
                ? t('constructionInspection.status.carriedOver')
                : t('constructionInspection.status.carriedOverNoMoney')}
            </span>
          )}
          <span>{t('constructionInspection.status.keys')}</span>
        </div>
      )}
    </div>
  );
}
