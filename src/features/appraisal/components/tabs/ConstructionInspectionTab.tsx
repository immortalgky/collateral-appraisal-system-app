import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useBasePath,
  useAppraisalId,
  useAppraisalInspectionNumber,
  useAppraisalAppraisedValue,
} from '@/features/appraisal/context/AppraisalContext';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { baht, hasConstructionData, pct, sumWork } from '../construction/constructionGrid';
import axios from '@shared/api/axiosInstance';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useEnrichedPropertyGroups } from '../../hooks/useEnrichedPropertyGroups';
import { usePropertyBasePath } from '../../hooks/usePropertyBasePath';
import { useConstructionWorkGroups } from '../../api/constructionWorkGroups';
import { mapConstructionInspectionResponseToForm } from '../../utils/mappers';
import { proportionStatus, roundBaht } from '../../utils/constructionMoney';
import { buildingFinalCostValue } from '@/features/pricingAnalysis/domain/calculation';
import { ConstructionDetailTable } from '../construction/ConstructionDetailTable';
import { useConstructionScope } from '../construction/constructionScope';
import { ConstructionSummaryForm } from '../construction/ConstructionSummaryForm';
import { ConstructionRemarkField } from '../construction/ConstructionRemarkField';
import type { PropertyItem } from '../../types';
import { isBuildingType, getDetailEndpoint, getRouteSegment } from '../../utils/propertyTypeConfig';

// One empty list for every render, so the memos below do not recompute when there are no rows.
const NO_ROWS: never[] = [];
const NO_WORK_GROUPS: never[] = [];

interface ConstructionInspectionTabProps {
  readOnly?: boolean;
  /**
   * Progressive (ใบตรวจงวด) appraisal. The work items, their proportions and the
   * detail/summary mode are carried over from the previous inspection round by
   * `ConstructionInspection.CopyForNextInspection`.
   *
   * Only two things stay locked on such a round: the detail/summary mode itself (flipping
   * it wipes the carried-over data) and the copy-from-another-property shortcut. The work
   * items and their proportions ARE editable — an inspector who finds work that the previous
   * round missed has to be able to add it and rebalance the split back to 100%. The
   * previous-round progress percentages are display-only for everyone, here and in the
   * summary form, since they are recorded history.
   */
  ciMode?: boolean;
  /**
   * Condo unit. Without a value base it decides the toolbar figure (the appraised value, unscaled —
   * a house gets none) and the hint's wording (a condo has no Building tab to fill).
   */
  condo: boolean;
}

export function ConstructionInspectionTab({
  readOnly,
  ciMode,
  condo,
}: ConstructionInspectionTabProps) {
  const { t } = useTranslation('appraisal');
  const navigate = useNavigate();
  const basePath = useBasePath();
  const appraisalId = useAppraisalId();
  const inspectionNumber = useAppraisalInspectionNumber();
  const { propertyId } = useParams<{ propertyId: string }>();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');
  const propertyBasePath = usePropertyBasePath();

  // Fetch work groups from API
  const {
    data: workGroups = NO_WORK_GROUPS,
    isLoading: workGroupsLoading,
    isError: workGroupsFailed,
  } = useConstructionWorkGroups();

  // Property selector data
  const { groups } = useEnrichedPropertyGroups(appraisalId ?? '');
  const { buildingProperties, currentProperty } = useMemo(() => {
    for (const group of groups ?? []) {
      const found = group.items.find(item => item.id === propertyId);
      if (found) {
        return {
          buildingProperties: group.items.filter(item => isBuildingType(item.type)),
          currentProperty: found,
        };
      }
    }
    return { buildingProperties: [] as PropertyItem[], currentProperty: undefined };
  }, [groups, propertyId]);

  const handlePropertySelect = (property: PropertyItem) => {
    if (property.id === propertyId) {
      return;
    }
    const segment = getRouteSegment(property.type);
    const gId = groupId ?? groups?.find(g => g.items.some(i => i.id === property.id))?.id;
    const params = new URLSearchParams();
    if (gId) params.set('groupId', gId);
    params.set('tab', 'construction');
    navigate(`${basePath}/${propertyBasePath}/${segment}/${property.id}?${params.toString()}`);
  };

  // React Hook Form integration
  const { control, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'constructionSubItems' });

  const enterDetail = useWatch({ control, name: 'constructionEnterDetail' }) ?? true;
  const subItems = useWatch({ control, name: 'constructionSubItems' }) ?? NO_ROWS;
  const summary = useWatch({ control, name: 'constructionSummary' });
  const remark = useWatch({ control, name: 'constructionRemark' }) ?? '';

  // Total Value = this building's Building Cost Value (see buildingCostValue below).
  //
  // A condo unit has no depreciation table, so that figure is 0, and its value does not follow the
  // progress: the toolbar shows the appraisal's appraised value, unscaled and labelled "whole
  // appraisal". Close to, not the same as, what ConstructionCurrentValueService substitutes for the
  // reports — that sums only the groups holding an inspection, so another group on the appraisal
  // (a machine, a plot) is in this figure and not in theirs.
  const appraisedValue = useAppraisalAppraisedValue();
  // The appraiser's keyed Final Cost Value sits beside the depreciation table in this same form
  // (see BuildingDetail.tsx, where it is edited).
  // The building's Building Cost Value, not the raw schedule sum: `finalCostValueOverride ??
  // roundToThousand(Σ priceAfterDepreciation)`. Reading the sum directly meant a building the
  // appraiser had priced by hand still based its whole inspection on the table it overrode — the
  // 100% figure, every work row's Construction Value, Current Value, and from there the summary
  // book, the Decision Summary card, the engagement's frozen value and the regulatory export.
  //
  // Same helper the pricing screen and PricingPropertyDataService.BuildingCostSql price against, so
  // "what is this building worth once finished" has one answer across the system.
  //
  // Watched as that one number (`compute`), not as the whole depreciation table: typing in the
  // Building tab's schedule no longer re-renders this hidden grid on every keystroke.
  const buildingCostValue = useWatch({
    control,
    compute: values =>
      buildingFinalCostValue({
        finalCostValueOverride: values.finalCostValueOverride,
        depreciationDetails: values.depreciationDetails ?? NO_ROWS,
      } as Record<string, unknown>),
  });

  // Rounded because the server rounds it on save and the payload sends the same rounded
  // figure, so the rows on screen are derived from the base the database will hold.
  const totalValue = roundBaht(buildingCostValue);
  // True while the property values its own construction — a house, through its depreciation table.
  // Tested on the rounded figure, as the server tests the one it stores. False for a condo unit
  // (bought finished, its value does not step up with the milestone) and for a house whose building
  // cost is not in yet: no money column is shown (showMoney) and only the percentages move.
  const hasOwnValueBase = totalValue > 0;

  // Calculations — user inputs proportionPct (%) and currentProgressPct (%)
  // constructionValue = totalValue * (proportionPct / 100)
  const computedSubItems = useMemo(() => {
    return (subItems as any[]).map((item: any, index: number) => {
      const proportionPct = Number(item.proportionPct) || 0;
      const previousProgressPct = Number(item.previousProgressPct) || 0;
      const currentProgressPct = Number(item.currentProgressPct) || 0;
      const constructionValue = roundBaht(totalValue * (proportionPct / 100));
      const currentProportionPct = proportionPct * (currentProgressPct / 100);
      return {
        ...item,
        _index: index,
        // useFieldArray's id: stays with the row when others are added, removed or copied over.
        _key: fields[index]?.id ?? String(index),
        constructionValue,
        proportionPct,
        currentProportionPct,
        previousPropertyValue: roundBaht(constructionValue * (previousProgressPct / 100)),
        currentPropertyValue: roundBaht(constructionValue * (currentProgressPct / 100)),
      };
    });
  }, [subItems, fields, totalValue]);

  const workTotals = useMemo(() => sumWork(computedSubItems), [computedSubItems]);

  // Money here and in the rows is shown only with a value base of its own (see showMoney).
  const summaryCurrentValue = roundBaht(
    totalValue * ((summary?.summaryCurrentProgressPct ?? 0) / 100),
  );

  // Derived rather than read from summaryPreviousValue: that column is computed here for display
  // and never written back into the form, so what persists is 0. The percentage is bound to a real
  // input and does persist — the same reason the server derives its figures from the percentage.
  const summaryPreviousValue = roundBaht(
    totalValue * ((summary?.summaryPreviousProgressPct ?? 0) / 100),
  );

  // Read off the entered percentages, never off the money. Dividing the money by the base stopped
  // being exact once the money was rounded to whole baht (CA-614) — a finished building read
  // 99.98% — and without a value base there is no ratio to take at all: a condo whose appraised
  // value has not been set yet would report 0% however much progress the inspector entered.
  // Share of the whole building: Σ(proportion × progress / 100) — the figure the server reports.
  const previousProgress = enterDetail
    ? workTotals.previousShare
    : (summary?.summaryPreviousProgressPct ?? 0);
  const overallProgress = enterDetail
    ? workTotals.currentShare
    : (summary?.summaryCurrentProgressPct ?? 0);
  // Without a value base the appraised value stands whatever the progress, as the server stores it.
  // A house without its building cost has no figure yet (shown as —).
  const currentValue: number | null = !hasOwnValueBase
    ? condo && appraisedValue
      ? roundBaht(appraisedValue)
      : null
    : enterDetail
      ? workTotals.currentValue
      : summaryCurrentValue;

  // Previous-round columns on a progressive round, and wherever previous figures exist at all
  // (older data): hidden, they would still be saved without anyone seeing them.
  const showPrevious =
    !!ciMode ||
    computedSubItems.some((i: { previousProgressPct: number }) => i.previousProgressPct > 0) ||
    (summary?.summaryPreviousProgressPct ?? 0) > 0;
  const [showCalculated, setShowCalculated] = useState(false);
  // Switching method discards the other method's data on save. On a progressive round it is
  // locked while any method-specific data is on the form — carried over, saved or just typed; guessing
  // which of it "came over" missed cases (0% rows, a saved summary) and lost them. Clearing the rows
  // unlocks it.
  // The remark is kept in both methods, so it does not count.
  const hasCarriedOver = hasConstructionData({
    constructionSubItems: subItems,
    constructionSummary: summary,
  });
  const modeLocked = !!readOnly || (!!ciMode && hasCarriedOver);
  const split = proportionStatus(workTotals.proportion);

  // Saving sends one method only, so switching method throws away what the current one holds.
  // Locked outright on a progressive round (above); elsewhere it is allowed after a confirmation.
  const [pendingMethod, setPendingMethod] = useState<boolean | null>(null);
  const currentMethodHasData = enterDetail
    ? subItems.length > 0
    : hasConstructionData({ constructionSummary: summary });
  const applyMethod = (detail: boolean) =>
    setValue('constructionEnterDetail', detail, { shouldDirty: true });
  const requestMethod = (detail: boolean) => {
    if (detail === enterDetail) return;
    if (currentMethodHasData) setPendingMethod(detail);
    else applyMethod(detail);
  };

  // Copy from another property
  const [isCopying, setIsCopying] = useState(false);

  const otherBuildingProperties = useMemo(
    () => buildingProperties.filter(p => p.id !== propertyId),
    [buildingProperties, propertyId],
  );

  // Copying replaces this property's rows, summary and remark wholesale: ask first when any is there.
  const [pendingCopy, setPendingCopy] = useState<PropertyItem | null>(null);
  // Still this property once the GET returns? The page's form is shared across building switches.
  const scope = useConstructionScope();
  const requestCopy = (source: PropertyItem) => {
    if (
      hasConstructionData({
        constructionSubItems: subItems,
        constructionSummary: summary,
        constructionRemark: remark,
      })
    )
      setPendingCopy(source);
    else handleCopyFrom(source);
  };
  const handleCopyFrom = async (source: PropertyItem) => {
    setIsCopying(true);
    try {
      const endpoint = getDetailEndpoint(source.type) ?? 'building-detail';
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${source.id}/${endpoint}`,
      );
      if (!scope.isActive()) {
        toast(t('constructionInspection.finishedAfterLeaving'));
        return;
      }
      const ci = data?.constructionInspection;
      if (!ci) {
        toast(t('constructionInspection.copyNothing'));
        return;
      }
      const mapped = mapConstructionInspectionResponseToForm(ci);
      // Set sub-items with id: null (new copies). Copying is offered only outside a progressive
      // round, where there is no previous round and its columns are hidden, so the source's
      // previous progress would be saved without anyone seeing it.
      const copiedSubItems = (mapped.constructionSubItems ?? []).map((item: any) => ({
        ...item,
        id: null,
        previousProgressPct: 0,
      }));
      // Clear document fields (source-specific)
      const copiedSummary = {
        ...mapped.constructionSummary,
        summaryPreviousProgressPct: 0,
        documentId: null,
        fileName: null,
        filePath: null,
        fileExtension: null,
        mimeType: null,
        fileSizeBytes: null,
      };
      setValue('constructionEnterDetail', mapped.constructionEnterDetail, { shouldDirty: true });
      setValue('constructionSubItems', copiedSubItems, { shouldDirty: true });
      setValue('constructionSummary', copiedSummary, { shouldDirty: true });
      setValue('constructionRemark', mapped.constructionRemark, { shouldDirty: true });
    } catch {
      if (scope.isActive()) toast.error(t('constructionInspection.copyFailed'));
    } finally {
      setIsCopying(false);
    }
  };

  // Handlers
  const handleAddSubItem = (
    constructionWorkGroupId: string,
    constructionWorkItemId: string,
    workItemName: string,
  ) => {
    // Calculate displayOrder based on existing items in this group
    const existingInGroup = (subItems as any[]).filter(
      (i: any) => i.constructionWorkGroupId === constructionWorkGroupId,
    );
    append({
      id: null,
      constructionWorkGroupId,
      constructionWorkItemId,
      workItemName,
      displayOrder: existingInGroup.length + 1,
      proportionPct: 0,
      previousProgressPct: 0,
      currentProgressPct: 0,
    });
  };

  const handleUpdateSubItem = (index: number, field: string, value: number) => {
    setValue(`constructionSubItems.${index}.${field}`, value, { shouldDirty: true });
  };

  const handleDeleteSubItem = (index: number) => {
    remove(index);
  };

  return (
    // No top rule: the tab is only shown beside the Building tab, so the editor's tab bar is always
    // right above and its baseline is this edge — as with the Building form's sheet.
    <div className="bg-white border border-t-0 border-[#e3e9e8] text-[#1f2937]">
      {/* Toolbar: method, building, round, and the figures that answer "where are we" */}
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[6px] min-h-[46px] px-[10px] py-[6px] border-b border-[#e3e9e8]">
        <div
          role="group"
          aria-label={t('constructionInspection.method.label')}
          title={
            ciMode && hasCarriedOver ? t('constructionInspection.method.lockedHint') : undefined
          }
          className="inline-flex gap-[2px] p-[2px] rounded-[8px] bg-[#edf1f1]"
        >
          {([true, false] as const).map(detail => {
            const active = enterDetail === detail;
            return (
              <button
                key={String(detail)}
                type="button"
                aria-pressed={active}
                disabled={modeLocked}
                onClick={() => requestMethod(detail)}
                className={clsx(
                  'px-[9px] py-[3px] rounded-[6px] text-[12px] whitespace-nowrap disabled:cursor-not-allowed',
                  active
                    ? 'bg-white text-[#0f766e] font-medium shadow-sm'
                    : clsx('text-[#55636f]', modeLocked && 'opacity-45'),
                )}
              >
                {detail
                  ? t('constructionInspection.method.detail')
                  : t('constructionInspection.method.summary')}
              </button>
            );
          })}
        </div>
        {ciMode && hasCarriedOver && (
          // Said on screen, not only in a tooltip: a disabled button gives no other clue why.
          <span
            title={t('constructionInspection.method.lockedHint')}
            className="inline-flex items-center gap-[4px] text-[11.5px] text-[#8a96a0] whitespace-nowrap"
          >
            <Icon name="lock" style="solid" className="size-[10px]" />
            {t('constructionInspection.method.locked')}
          </span>
        )}
        <span className="w-px h-[20px] bg-[#e3e9e8]" />

        {/* Property Selector */}
        <PropertyMenu
          title={t('constructionInspection.buildingProperties')}
          items={buildingProperties}
          currentId={propertyId}
          disabled={buildingProperties.length === 0}
          buttonClassName="group inline-flex items-center gap-[6px] h-[28px] px-[9px] rounded-[7px] border border-[#e3e9e8] bg-white text-[12px] hover:border-[#cbd5d3] hover:bg-[#f8fafa]"
          button={
            <>
              <span className="text-[#8a96a0]">{t('constructionInspection.building')}</span>
              <span className="max-w-[200px] truncate">
                {currentProperty?.address || t('constructionInspection.selectProperty')}
              </span>
              <Icon
                name="chevron-down"
                style="solid"
                className="size-[9px] text-[#8a96a0] transition-transform duration-200 group-data-[open]:rotate-180"
              />
            </>
          }
          onPick={handlePropertySelect}
        />

        {/* Copy From */}
        {!readOnly && !ciMode && otherBuildingProperties.length > 0 && (
          <PropertyMenu
            title={t('constructionInspection.copyFromTitle')}
            items={otherBuildingProperties}
            disabled={isCopying}
            buttonClassName="inline-flex items-center gap-[6px] h-[28px] px-[9px] rounded-[7px] border border-[#e3e9e8] bg-white text-[12px] hover:border-[#cbd5d3] hover:bg-[#f8fafa] text-[#55636f] disabled:opacity-50"
            button={
              <>
                {isCopying ? (
                  <Icon name="spinner" style="solid" className="size-[11px] animate-spin" />
                ) : (
                  <Icon name="copy" style="regular" className="size-[11px]" />
                )}
                {t('constructionInspection.copyFrom')}
              </>
            }
            onPick={requestCopy}
          />
        )}

        <span className="inline-flex items-center gap-[6px] text-[13px] font-semibold whitespace-nowrap">
          {inspectionNumber != null && (
            <span className="rounded-[5px] bg-[#f0fdfa] px-[6px] py-px text-[11px] text-[#0f766e]">
              {t('constructionInspection.inspectionRound', { n: inspectionNumber })}
            </span>
          )}
          {t('constructionInspection.sectionTitle')}
        </span>

        <span className="flex-1 min-w-[8px]" />

        <div className="ml-auto flex items-center gap-[16px] tabular-nums">
          {hasOwnValueBase && (
            <div className="flex flex-col items-end leading-[1.15]">
              <span className="text-[10px] text-[#8a96a0] whitespace-nowrap">
                {t('constructionInspection.kpi.value100')}
              </span>
              <b className="text-[12px] font-semibold">{baht(totalValue)}</b>
            </div>
          )}
          <div className="flex flex-col items-end leading-[1.15]">
            <span className="text-[10px] text-[#8a96a0] whitespace-nowrap">
              {t('constructionInspection.kpi.progress')}
            </span>
            <b className="text-[12px] font-semibold whitespace-nowrap">
              {showPrevious && (
                <small className="text-[10px] font-normal text-[#8a96a0]">
                  {pct(previousProgress)} →{' '}
                </small>
              )}
              {pct(overallProgress)}%
            </b>
          </div>
          <div className="flex flex-col items-end leading-[1.15] pr-[6px]">
            <span className="text-[10.5px] text-[#8a96a0] whitespace-nowrap">
              {!hasOwnValueBase && condo
                ? t('constructionInspection.kpi.appraisedValue')
                : t('constructionInspection.kpi.currentValue')}
            </span>
            <span className="text-[15px] font-semibold text-[#0f766e] whitespace-nowrap">
              {/* Not priced yet: no figure, rather than a valuation of 0 (the server reports none). */}
              {currentValue == null ? '—' : `${baht(currentValue)} ฿`}
            </span>
          </div>
        </div>
      </div>

      {/* Table title + tools */}
      <div className="flex items-center gap-[10px] min-h-[34px] px-[10px] border-b border-[#e3e9e8]">
        <span className="flex items-center gap-[6px] text-[12.5px] font-medium text-[#0f766e] whitespace-nowrap">
          {enterDetail
            ? t('constructionInspection.tabs.items')
            : t('constructionInspection.method.summary')}
          {enterDetail && (
            <span className="rounded-full bg-[#edf1f1] px-[6px] text-[10.5px] leading-[16px] text-[#55636f]">
              {subItems.length}
            </span>
          )}
        </span>

        {enterDetail && (
          <div className="ml-auto flex items-center gap-[10px] text-[12px] text-[#55636f]">
            <label className="inline-flex items-center gap-[5px] cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={showCalculated}
                onChange={e => setShowCalculated(e.target.checked)}
                className="size-[14px] accent-[#0d9488] cursor-pointer"
              />
              {t('constructionInspection.showCalculated')}
            </label>
            {subItems.length > 0 && (
              <span
                // Anchor for a failed save's split error: the editor header counts it on this tab and jumps
                // here through its data-field lookup, like any other field.
                data-field="constructionSubItems"
                className={clsx(
                  'rounded-full px-[8px] text-[11.5px] font-semibold leading-[20px] whitespace-nowrap',
                  split === 'ok'
                    ? 'bg-[#f0fdf4] text-[#15803d]'
                    : split === 'short'
                      ? 'bg-[#fffbeb] text-[#b45309]'
                      : 'bg-[#fef2f2] text-[#dc2626]',
                )}
              >
                {split === 'ok'
                  ? t('constructionInspection.split.ok')
                  : t(
                      split === 'short'
                        ? 'constructionInspection.split.short'
                        : 'constructionInspection.split.over',
                      {
                        pct: pct(workTotals.proportion),
                        diff: pct(Math.abs(100 - workTotals.proportion)),
                      },
                    )}
              </span>
            )}
          </div>
        )}
      </div>

      {!hasOwnValueBase && (
        <div
          className={clsx(
            'flex items-start gap-[6px] px-[10px] py-[6px] border-b border-[#e3e9e8] text-[11.5px] leading-[16px]',
            condo ? 'bg-[#f8fafa] text-[#55636f]' : 'bg-[#fffbeb] text-[#b45309]',
          )}
        >
          <Icon
            name={condo ? 'circle-info' : 'triangle-exclamation'}
            style="solid"
            className="size-[12px] mt-[2px] shrink-0"
          />
          {condo
            ? t('constructionInspection.valueHint.condo')
            : // Only someone who can edit the Building tab is told to fill it in.
              readOnly
              ? t('constructionInspection.valueHint.noValueBase')
              : t('constructionInspection.valueHint.noValueBaseEditable')}
        </div>
      )}

      {enterDetail ? (
        <ConstructionDetailTable
          workGroups={workGroups}
          computedSubItems={computedSubItems}
          totals={workTotals}
          split={split}
          workGroupsLoading={workGroupsLoading}
          workGroupsFailed={workGroupsFailed}
          showPrevious={showPrevious}
          showCalculated={showCalculated}
          showMoney={hasOwnValueBase}
          onAddSubItem={handleAddSubItem}
          onUpdateSubItem={handleUpdateSubItem}
          onDeleteSubItem={handleDeleteSubItem}
          readOnly={readOnly}
        />
      ) : (
        <ConstructionSummaryForm
          summary={summary}
          summaryCurrentValue={summaryCurrentValue}
          summaryPreviousValue={summaryPreviousValue}
          onUpdateSummary={(field, value) =>
            setValue(`constructionSummary.${field}`, value, { shouldDirty: true })
          }
          showPrevious={showPrevious}
          showMoney={hasOwnValueBase}
          readOnly={readOnly}
        />
      )}

      {/* Captured in both modes: it is stored on the inspection itself and printed as the remark
          row of the construction summary report. */}
      <div className="p-[12px] border-t border-[#e3e9e8]">
        <ConstructionRemarkField
          value={remark}
          onChange={value => setValue('constructionRemark', value, { shouldDirty: true })}
          readOnly={readOnly}
        />
      </div>
      <ConfirmDialog
        isOpen={pendingCopy !== null}
        variant="warning"
        title={t('constructionInspection.copyConfirmTitle')}
        message={t('constructionInspection.copyConfirmMessage')}
        confirmText={t('constructionInspection.clearGuard.confirm')}
        cancelText={t('constructionInspection.clearGuard.cancel')}
        onConfirm={() => {
          if (pendingCopy) handleCopyFrom(pendingCopy);
          setPendingCopy(null);
        }}
        onClose={() => setPendingCopy(null)}
      />
      <ConfirmDialog
        isOpen={pendingMethod !== null}
        variant="warning"
        title={t('constructionInspection.method.switchTitle')}
        message={t('constructionInspection.method.switchMessage')}
        confirmText={t('constructionInspection.clearGuard.confirm')}
        cancelText={t('constructionInspection.clearGuard.cancel')}
        onConfirm={() => {
          if (pendingMethod !== null) applyMethod(pendingMethod);
          setPendingMethod(null);
        }}
        onClose={() => setPendingMethod(null)}
      />
    </div>
  );
}

/** The toolbar's two property lists (switch building, copy from): a titled Headless UI menu. */
function PropertyMenu({
  title,
  items,
  currentId,
  disabled,
  button,
  buttonClassName,
  onPick,
}: {
  title: string;
  items: PropertyItem[];
  currentId?: string;
  disabled?: boolean;
  button: ReactNode;
  buttonClassName: string;
  onPick: (item: PropertyItem) => void;
}) {
  return (
    <Menu>
      <MenuButton disabled={disabled} className={buttonClassName}>
        {button}
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom start', gap: 6, padding: 8 }}
        className="z-50 min-w-[260px] max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl focus:outline-none"
      >
        <div className="px-3 pb-1.5 mb-1 border-b border-gray-100">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </span>
        </div>
        {items.map(item => {
          const current = item.id === currentId;
          return (
            <MenuItem key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm data-[focus]:bg-gray-50 ${
                  current ? 'bg-primary/5 text-primary' : 'text-gray-700'
                }`}
              >
                <span
                  className={`inline-block size-2 rounded-full flex-shrink-0 ${
                    current ? 'bg-primary ring-2 ring-primary/20' : 'bg-gray-300'
                  }`}
                />
                <span className="truncate font-medium text-xs">{item.address}</span>
                {current && (
                  <Icon
                    name="check"
                    style="solid"
                    className="size-3 text-primary ml-auto flex-shrink-0"
                  />
                )}
              </button>
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
