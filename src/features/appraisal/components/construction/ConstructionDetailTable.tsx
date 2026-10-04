import { Fragment, useEffect, useMemo, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { z } from 'zod';
import NumberInput from '@shared/components/inputs/NumberInput';
import ConfirmDeleteButton from '@/shared/components/ConfirmDeleteButton';
import Icon from '@shared/components/Icon';
import { schemas } from '@shared/schemas/v1';
import {
  baht,
  CELL,
  INPUT_TD,
  isPendingProgress,
  isRegressedProgress,
  NAME,
  pct,
  INPUT_BOX,
  REGRESSED,
  RO,
  sumWork,
  TD,
  TH,
  type ComputedItem,
  type RowFigures,
  type WorkTotals,
} from './constructionGrid';
import type { proportionStatus } from '../../utils/constructionMoney';
import { Change, HeaderCell } from './constructionGridCells';

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

const CATEGORY_ICONS: Record<string, string> = {
  BuildingStructure: 'cubes',
  Architecture: 'layer-group',
  BuildingManagement: 'gears',
};

/**
 * The group's "+ Add item" list. A menu rather than a native <select>: a closed select changes value
 * on every arrow key on Windows, and each change would have added an item.
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
  return (
    <Menu>
      <MenuButton className="inline-flex items-center gap-[4px] h-[21px] px-[7px] rounded-[4px] border border-dashed border-[color:var(--palette-accent-line)] bg-[color:var(--palette-surface)] text-[0.875rem] font-medium text-[color:var(--palette-accent-ink)] hover:border-[#0d9488] focus:outline-none focus:border-[#0d9488]">
        {label}
        <Icon name="chevron-down" style="solid" className="size-[8px]" />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom start', gap: 4, padding: 8 }}
        className="z-50 max-h-[240px] min-w-[190px] overflow-y-auto rounded-[8px] border border-[color:var(--palette-line)] bg-[color:var(--palette-surface)] py-[4px] shadow-xl focus:outline-none"
      >
        {items.map(item => (
          <MenuItem key={item.id}>
            <button
              type="button"
              onClick={() => onPick(item)}
              className="block w-full px-[10px] py-[3px] text-left text-[0.875rem] leading-[1.5385rem] text-[color:var(--palette-ink)] data-[focus]:bg-[color:var(--palette-accent-wash)]"
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

  const header = (label: string, unit: string) => (
    <HeaderCell key={label} label={label} unit={unit} />
  );
  // The one list of visible columns: the header row renders it, and the group band spans it.
  const headerCells = [
    <th key="name" className={clsx(TH, NAME, 'text-left z-20')}>
      {t('constructionInspection.grid.workItem')}
    </th>,
    header(t('constructionInspection.grid.proportion'), '(%)'),
    showCalculated &&
      showMoney &&
      header(
        t('constructionInspection.grid.constructionValue'),
        t('constructionInspection.grid.baht'),
      ),
    showPrevious && header(t('constructionInspection.grid.previousProgress'), '(%)'),
    header(t('constructionInspection.grid.currentProgress'), '(%)'),
    showPrevious && header(t('constructionInspection.grid.change'), '(%)'),
    showCalculated &&
      header(
        t('constructionInspection.grid.currentShare'),
        t('constructionInspection.grid.ofBuilding'),
      ),
    showCalculated &&
      showPrevious &&
      showMoney &&
      header(t('constructionInspection.grid.previousValue'), t('constructionInspection.grid.baht')),
    showMoney &&
      header(t('constructionInspection.grid.currentValue'), t('constructionInspection.grid.baht')),
    !readOnly && <th key="actions" className={clsx(TH, 'w-[3.75rem] min-w-[3.75rem]')} />,
  ].filter(Boolean);
  const fullSpan = headerCells.length;

  const pctInput = (item: ComputedItem, field: 'proportionPct' | 'currentProgressPct') => {
    const value = item[field];
    const regressedCell = field === 'currentProgressPct' && isRegressed(item);
    if (readOnly)
      return (
        <td className={clsx(TD, 'text-right', regressedCell && 'text-[#dc2626]')}>{pct(value)}</td>
      );
    return (
      <td className={INPUT_TD}>
        <NumberInput
          dense
          value={value}
          onChange={e => onUpdateSubItem(item._index, field, e.target.value ?? 0)}
          decimalPlaces={2}
          max={100}
          data-ci-col={field}
          data-ci-row={item._index}
          onKeyDown={handleKeyDown}
          aria-label={`${itemName(item)} ${field === 'proportionPct' ? t('constructionInspection.grid.proportion') : t('constructionInspection.grid.currentProgress')}`}
          className={regressedCell ? REGRESSED : INPUT_BOX}
        />
      </td>
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
        <td className={clsx(TD, 'text-right')}>{baht(f.constructionValue)}</td>
      )}
      {showPrevious && <td className={clsx(TD, 'text-right', RO)}>{pct(f.previousProgress)}</td>}
      {cells.current}
      {showPrevious && (
        <td className={clsx(TD, 'text-right')}>
          <Change
            from={f.previousProgress}
            to={f.currentProgress}
            final={final}
            incomplete={opts.incomplete}
          />
        </td>
      )}
      {showCalculated && (
        <td className={clsx(TD, 'text-right')}>
          {opts.shareIsProgress ? '' : pct(f.currentShare)}
        </td>
      )}
      {showCalculated && showPrevious && showMoney && (
        <td className={clsx(TD, 'text-right', RO)}>{baht(f.previousValue)}</td>
      )}
      {showMoney && <td className={clsx(TD, 'text-right')}>{baht(f.currentValue)}</td>}
    </>
  );

  const totalRow = (
    label: string,
    f: WorkTotals,
    rowClass: string,
    opts: { incomplete: boolean; shareIsProgress?: boolean },
    proportionClass = '',
  ) => (
    <tr className={rowClass}>
      <td className={clsx(TD, NAME, 'bg-inherit')}>{label}</td>
      {figures(
        f,
        {
          proportion: (
            <td className={clsx(TD, 'text-right', proportionClass)}>{pct(f.proportion)}</td>
          ),
          current: <td className={clsx(TD, 'text-right')}>{pct(f.currentProgress)}</td>,
        },
        opts,
      )}
      {!readOnly && <td className={TD} />}
    </tr>
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-[0.875rem] leading-[1.9231rem] tabular-nums text-[color:var(--palette-ink)]">
          <thead>
            <tr>{headerCells}</tr>
          </thead>
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
                  <tr className="bg-[color:var(--palette-surface-3)] text-[0.8462rem] font-semibold text-[color:var(--palette-ink-2)] leading-[1.7692rem]">
                    <td className={clsx(CELL, NAME, 'bg-[color:var(--palette-surface-3)] p-0')}>
                      <button
                        type="button"
                        onClick={() => setCollapsed(c => ({ ...c, [group.id]: !c[group.id] }))}
                        aria-expanded={!isCollapsed}
                        className="flex items-center gap-[6px] w-full h-full px-[8px] text-left"
                      >
                        <Icon
                          name="chevron-down"
                          style="solid"
                          className={clsx(
                            'size-[9px] transition-transform',
                            isCollapsed && '-rotate-90',
                          )}
                        />
                        <Icon
                          name={CATEGORY_ICONS[group.code] || 'folder'}
                          style="solid"
                          className="size-[11px] text-[color:var(--palette-ink-3)]"
                        />
                        <span className="truncate">{groupName}</span>
                      </button>
                    </td>
                    <td className={TD} colSpan={fullSpan - 1}>
                      <div className="flex items-center gap-[10px]">
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
                        <span className="ml-auto font-normal text-[color:var(--palette-ink-3)]">
                          {t('constructionInspection.grid.itemCount', { count: items.length })}
                          {isCollapsed &&
                            ` · ${pct(groupTotals.currentProgress)}%` +
                              (showMoney ? ` · ${baht(groupTotals.currentValue)}` : '')}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {!isCollapsed &&
                    items.map(item => {
                      const name = itemName(item);
                      return (
                        <tr key={item._key} className="bg-[color:var(--palette-surface)]">
                          <td className={clsx(TD, NAME, 'bg-[color:var(--palette-surface)]')}>
                            <span className="block truncate">{name}</span>
                          </td>
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
                            <td
                              className={clsx(
                                CELL,
                                'w-[3.75rem] min-w-[3.75rem] p-0 text-center align-middle leading-[0]',
                              )}
                            >
                              {/* Two clicks instead of a modal: the first arms the button. */}
                              <ConfirmDeleteButton
                                onConfirm={() => onDeleteSubItem(item._index)}
                                label={t('constructionInspection.grid.remove', { name })}
                                className="inline-grid h-[20px] w-[20px] place-items-center rounded-[4px] leading-none text-[color:var(--palette-ink-3)] hover:bg-[#fef2f2] hover:text-[#dc2626]"
                              >
                                <Icon name="xmark" style="solid" className="size-[11px]" />
                              </ConfirmDeleteButton>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                  {!isCollapsed &&
                    items.length > 0 &&
                    totalRow(
                      t('constructionInspection.grid.groupTotal', { name: groupName }),
                      groupTotals,
                      'bg-[color:var(--palette-surface-2)] font-semibold',
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
                'bg-[color:var(--palette-accent-wash)] font-bold text-[color:var(--palette-accent-ink)] [&>td]:border-t [&>td]:border-t-[color:var(--palette-line-strong)]',
                { incomplete: pending.length > 0, shareIsProgress: true },
                split === 'over'
                  ? 'text-[#dc2626]'
                  : split === 'short'
                    ? 'text-[color:var(--palette-warn)]'
                    : '',
              )}
          </tbody>
        </table>
      </div>

      {workGroupsLoading && computedSubItems.length > 0 && (
        <div className="px-[12px] py-[6px] text-[0.75rem] text-[color:var(--palette-ink-3)] border-t border-t-[color:var(--palette-line)]">
          {t('constructionInspection.grid.workGroupsLoading')}
        </div>
      )}
      {workGroupsFailed && (
        <div className="px-[12px] py-[6px] text-[0.75rem] text-[#dc2626] border-t border-t-[color:var(--palette-line)]">
          {t('constructionInspection.grid.workGroupsFailed')}
        </div>
      )}
      {computedSubItems.length === 0 && (
        <div className="px-[16px] py-[32px] text-center text-[0.875rem] text-[color:var(--palette-ink-3)]">
          {readOnly
            ? t('constructionInspection.grid.emptyReadOnly')
            : t('constructionInspection.grid.empty')}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[2px] min-h-[28px] px-[12px] py-[4px] border-t border-t-[color:var(--palette-line)] bg-[color:var(--palette-surface-2)] text-[0.75rem] text-[color:var(--palette-ink-3)]">
          {split === 'over' && (
            <span className="font-medium text-[#dc2626]">
              {t('constructionInspection.status.overBlocksSave', { pct: pct(total.proportion) })}
            </span>
          )}
          {pending.length > 0 && (
            <span className="text-[color:var(--palette-warn)]">
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
            <span className="text-[#dc2626]">
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
