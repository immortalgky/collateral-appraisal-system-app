import { Fragment, useEffect, useMemo, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
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
import { Change, HeadLabel } from './constructionGridCells';

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
  onAddSubItem: (
    constructionWorkGroupId: string,
    constructionWorkItemId: string,
    workItemName: string,
  ) => void;
  onUpdateSubItem: (index: number, field: string, value: number) => void;
  onDeleteSubItem: (index: number) => void;
  readOnly?: boolean;
}

const OTHER_GROUP = '__other';

/** Column widths in rem: the frozen work-item name, a figure, the row actions. */
const NAME_W = 13.7143;
const FIGURE_W = 7.1429;
const ACTIONS_W = 3.75;

const CATEGORY_ICONS: Record<string, string> = {
  BuildingStructure: 'cubes',
  Architecture: 'layer-group',
  BuildingManagement: 'gears',
};

/**
 * The group's "+ Add item" list. A menu rather than a native <select>: a closed select changes value
 * on every arrow key on Windows, and each change would have added an item. The button is drawn like
 * the kit's small outline add button.
 */
function AddItemMenu({
  label,
  items,
  itemLabel,
  onPick,
}: {
  label: string;
  items: ConstructionWorkItemDto[];
  itemLabel: (item: ConstructionWorkItemDto) => string;
  onPick: (item: ConstructionWorkItemDto) => void;
}) {
  const standard = useFormLayout() === 'standard';
  return (
    <Menu>
      <MenuButton
        className={clsx(
          'inline-flex items-center gap-1.5 border bg-(--palette-surface) px-3 text-xs font-medium text-(--palette-ink) hover:bg-(--palette-surface-2)',
          standard
            ? 'h-[2.1429rem] rounded-ctl border-(--palette-line-strong)'
            : 'h-[1.8571rem] rounded-ctl-c border-(--palette-line-strong)',
        )}
      >
        {label}
        <Icon name="chevron-down" style="solid" className="text-[0.7143rem]" />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom start', gap: 4, padding: 8 }}
        className="z-50 max-h-60 min-w-48 overflow-y-auto rounded-lg border border-(--palette-line) bg-(--palette-surface) py-1 shadow-xl focus:outline-none"
      >
        {items.map(item => (
          <MenuItem key={item.id}>
            <button
              type="button"
              onClick={() => onPick(item)}
              className="block w-full px-[0.7143rem] py-[0.2143rem] text-left text-sm leading-normal text-(--palette-ink) data-focus:bg-(--palette-accent-wash)"
            >
              {itemLabel(item)}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
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
  onAddSubItem,
  onUpdateSubItem,
  onDeleteSubItem,
  readOnly,
}: ConstructionDetailTableProps) {
  const { t, i18n } = useTranslation('appraisal');
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
  ): FormTableColumn<ComputedItem> => ({
    key,
    align: 'end',
    width: `${FIGURE_W}rem`,
    header: <HeadLabel label={label} unit={unit} />,
  });
  // The one list of visible columns: the head renders it, and the group band spans it.
  const columns = [
    {
      key: 'name',
      header: t('constructionInspection.grid.workItem'),
      width: `${NAME_W}rem`,
    },
    figureColumn('proportion', t('constructionInspection.grid.proportion'), '(%)'),
    showCalculated &&
      showMoney &&
      figureColumn(
        'constructionValue',
        t('constructionInspection.grid.constructionValue'),
        t('constructionInspection.grid.baht'),
      ),
    showPrevious &&
      figureColumn('previousProgress', t('constructionInspection.grid.previousProgress'), '(%)'),
    figureColumn('currentProgress', t('constructionInspection.grid.currentProgress'), '(%)'),
    showPrevious && figureColumn('change', t('constructionInspection.grid.change'), '(%)'),
    showCalculated &&
      figureColumn(
        'currentShare',
        t('constructionInspection.grid.currentShare'),
        t('constructionInspection.grid.ofBuilding'),
      ),
    showCalculated &&
      showPrevious &&
      showMoney &&
      figureColumn(
        'previousValue',
        t('constructionInspection.grid.previousValue'),
        t('constructionInspection.grid.baht'),
      ),
    showMoney &&
      figureColumn(
        'currentValue',
        t('constructionInspection.grid.currentValue'),
        t('constructionInspection.grid.baht'),
      ),
    !readOnly && { key: 'actions', kind: 'action' as const, width: `${ACTIONS_W}rem` },
  ].filter((c): c is FormTableColumn<ComputedItem> => !!c);
  const fullSpan = columns.length;
  const figureCount = fullSpan - 1 - (readOnly ? 0 : 1);
  const minWidth = NAME_W + FIGURE_W * figureCount + (readOnly ? 0 : ACTIONS_W);

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
        />
      </FormTableCell>
    );
  };

  /** The figure columns shared by the item, group and building rows. */
  const figures = (
    f: RowFigures,
    cells: { proportion: ReactNode; current: ReactNode },
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
      {showMoney && <FormTableCell align="end">{baht(f.currentValue)}</FormTableCell>}
    </>
  );

  const totalRow = (
    label: string,
    f: WorkTotals,
    rowClass: string,
    opts: { incomplete: boolean; shareIsProgress?: boolean },
    proportionClass = '',
  ) => (
    <FormTableRow className={rowClass}>
      <FormTableCell frozen="first" className="bg-inherit!">
        {label}
      </FormTableCell>
      {figures(
        f,
        {
          proportion: (
            <FormTableCell align="end" className={proportionClass}>
              {pct(f.proportion)}
            </FormTableCell>
          ),
          current: <FormTableCell align="end">{pct(f.currentProgress)}</FormTableCell>,
        },
        opts,
      )}
      {!readOnly && <FormTableCell />}
    </FormTableRow>
  );

  return (
    <div>
      <FormTableFrame minWidth={minWidth} bleed>
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
                <FormTableRow className="bg-(--palette-surface-3) text-xs font-semibold text-(--palette-ink-2)">
                  <FormTableCell frozen="first" className="bg-inherit!">
                    <button
                      type="button"
                      onClick={() => setCollapsed(c => ({ ...c, [group.id]: !c[group.id] }))}
                      aria-expanded={!isCollapsed}
                      className="flex w-full items-center gap-1.5 text-left"
                    >
                      <Icon
                        name="chevron-down"
                        style="solid"
                        className={clsx(
                          'text-[0.7143rem] transition-transform',
                          isCollapsed && '-rotate-90',
                        )}
                      />
                      <Icon
                        name={CATEGORY_ICONS[group.code] || 'folder'}
                        style="solid"
                        className="text-[0.8571rem] text-(--palette-ink-3)"
                      />
                      <span className="truncate">{groupName}</span>
                    </button>
                  </FormTableCell>
                  <FormTableCell colSpan={fullSpan - 1}>
                    <div className="flex items-center gap-2.5">
                      {!readOnly && available.length > 0 && (
                        <AddItemMenu
                          label={t('constructionInspection.grid.addItem')}
                          items={available}
                          itemLabel={i => (isThai ? i.nameTh : i.nameEn)}
                          onPick={picked => {
                            setCollapsed(c => ({ ...c, [group.id]: false }));
                            setFocusRow(computedSubItems.length);
                            onAddSubItem(group.id, picked.id, picked.nameEn);
                          }}
                        />
                      )}
                      <span className="ml-auto font-normal text-(--palette-ink-3)">
                        {t('constructionInspection.grid.itemCount', { count: items.length })}
                        {isCollapsed &&
                          ` · ${pct(groupTotals.currentProgress)}%` +
                            (showMoney ? ` · ${baht(groupTotals.currentValue)}` : '')}
                      </span>
                    </div>
                  </FormTableCell>
                </FormTableRow>

                {!isCollapsed &&
                  items.map(item => {
                    const name = itemName(item);
                    return (
                      <FormTableRow key={item._key}>
                        <FormTableCell frozen="first" className="max-w-[13.7143rem] truncate">
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

                {!isCollapsed &&
                  items.length > 0 &&
                  totalRow(
                    t('constructionInspection.grid.groupTotal', { name: groupName }),
                    groupTotals,
                    'bg-(--palette-surface-2) font-semibold',
                    { incomplete: items.some(isPending) },
                  )}
              </Fragment>
            );
          })}

          {/* Progress here is the share of the whole building (Σ proportion × progress / 100) — the
              toolbar's figure and the server's. The group rows keep their own weighted progress;
              the two readings agree once the split reaches 100%. */}
          {computedSubItems.length > 0 &&
            totalRow(
              t('constructionInspection.grid.buildingTotal'),
              {
                ...total,
                previousProgress: total.previousShare,
                currentProgress: total.currentShare,
              },
              'bg-(--palette-accent-wash) font-bold text-(--palette-accent-ink) [&>td]:border-t [&>td]:border-t-(--palette-line-strong)',
              { incomplete: pending.length > 0, shareIsProgress: true },
              split === 'over'
                ? 'text-(--palette-danger)'
                : split === 'short'
                  ? 'text-(--palette-warn)'
                  : '',
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
