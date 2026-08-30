import { useMemo, useState, useRef } from 'react';
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
import Toggle from '@shared/components/inputs/Toggle';
import { formatNumber } from '@shared/utils/formatUtils';
import axios from '@shared/api/axiosInstance';
import { useEnrichedPropertyGroups } from '../../hooks/useEnrichedPropertyGroups';
import { usePropertyBasePath } from '../../hooks/usePropertyBasePath';
import { useConstructionWorkGroups } from '../../api/constructionWorkGroups';
import { mapConstructionInspectionResponseToForm } from '../../utils/mappers';
import { roundBaht } from '../../utils/constructionMoney';
import { ConstructionDetailTable } from '../construction/ConstructionDetailTable';
import { ConstructionSummaryForm } from '../construction/ConstructionSummaryForm';
import { ConstructionRemarkField } from '../construction/ConstructionRemarkField';
import type { PropertyItem } from '../../types';
import { isBuildingType, getDetailEndpoint, getRouteSegment } from '../../utils/propertyTypeConfig';

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
}

export function ConstructionInspectionTab({ readOnly, ciMode }: ConstructionInspectionTabProps) {
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
  const { data: workGroups = [] } = useConstructionWorkGroups();

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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handlePropertySelect = (property: PropertyItem) => {
    if (property.id === propertyId) {
      setIsDropdownOpen(false);
      return;
    }
    const segment = getRouteSegment(property.type);
    const gId = groupId ?? groups?.find(g => g.items.some(i => i.id === property.id))?.id;
    const params = new URLSearchParams();
    if (gId) params.set('groupId', gId);
    params.set('tab', 'construction');
    navigate(`${basePath}/${propertyBasePath}/${segment}/${property.id}?${params.toString()}`);
    setIsDropdownOpen(false);
  };

  // React Hook Form integration
  const { control, setValue } = useFormContext();
  const { append, remove } = useFieldArray({ control, name: 'constructionSubItems' });

  const enterDetail = useWatch({ control, name: 'constructionEnterDetail' }) ?? true;
  const subItems = useWatch({ control, name: 'constructionSubItems' }) ?? [];
  const summary = useWatch({ control, name: 'constructionSummary' });
  const remark = useWatch({ control, name: 'constructionRemark' }) ?? '';
  const depreciationDetails = useWatch({ control, name: 'depreciationDetails' }) ?? [];

  // Total Value = sum of priceAfterDepreciation from building depreciation details.
  //
  // A condo unit has no depreciation table, so that sum is always 0 and every figure derived from
  // it — Current Value, Overall Progress, the per-row Value columns — collapsed to zero however
  // much progress the inspector entered. Fall back to the appraisal's own appraised value: it is
  // the same "worth once finished" figure the depreciation table gives a house, and it is the base
  // the server substitutes for the Decision Summary card, the construction report and the
  // regulatory export.
  const appraisedValue = useAppraisalAppraisedValue();
  const depreciationTotal = useMemo(
    () =>
      (depreciationDetails as any[]).reduce(
        (sum: number, item: any) => sum + (Number(item?.priceAfterDepreciation) || 0),
        0,
      ),
    [depreciationDetails],
  );

  // True while the property values its own construction — a house, through its depreciation table.
  // False for a condo unit, which is bought finished: its value does not step up with the milestone,
  // so the appraised value stands unscaled in every money column and only the percentage moves.
  const hasOwnValueBase = depreciationTotal > 0;
  // Rounded because the server rounds it on save and the payload sends the same rounded
  // figure, so the rows on screen are derived from the base the database will hold.
  const totalValue = roundBaht(hasOwnValueBase ? depreciationTotal : appraisedValue);

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
        constructionValue,
        proportionPct,
        currentProportionPct,
        previousPropertyValue: roundBaht(constructionValue * (previousProgressPct / 100)),
        currentPropertyValue: roundBaht(constructionValue * (currentProgressPct / 100)),
      };
    });
  }, [subItems, totalValue]);

  const categorySubtotals = useMemo(() => {
    const groupIds = workGroups.map(g => g.id);
    return groupIds
      .map(gId => {
        const items = computedSubItems.filter((i: any) => i.constructionWorkGroupId === gId);
        if (items.length === 0) return null;
        return {
          constructionWorkGroupId: gId,
          totalConstructionValue: items.reduce((s: number, i: any) => s + i.constructionValue, 0),
          totalProportion: items.reduce((s: number, i: any) => s + i.proportionPct, 0),
          totalCurrentProportion: items.reduce(
            (s: number, i: any) => s + (Number(i.currentProportionPct) || 0),
            0,
          ),
          averagePreviousProgress:
            items.reduce((s: number, i: any) => s + (Number(i.previousProgressPct) || 0), 0) /
            items.length,
          averageCurrentProgress:
            items.reduce((s: number, i: any) => s + (Number(i.currentProgressPct) || 0), 0) /
            items.length,
          totalPreviousPropertyValue: items.reduce(
            (s: number, i: any) => s + i.previousPropertyValue,
            0,
          ),
          totalCurrentPropertyValue: items.reduce(
            (s: number, i: any) => s + i.currentPropertyValue,
            0,
          ),
        };
      })
      .filter(Boolean) as any[];
  }, [computedSubItems, workGroups]);

  const grandTotal = useMemo(() => {
    const totalConstructionValue = computedSubItems.reduce(
      (s: number, i: any) => s + i.constructionValue,
      0,
    );
    const totalPreviousPropertyValue = computedSubItems.reduce(
      (s: number, i: any) => s + i.previousPropertyValue,
      0,
    );
    const totalCurrentPropertyValue = computedSubItems.reduce(
      (s: number, i: any) => s + i.currentPropertyValue,
      0,
    );
    return {
      totalConstructionValue,
      totalProportion: computedSubItems.reduce((s: number, i: any) => s + i.proportionPct, 0),
      totalCurrentProportion: computedSubItems.reduce(
        (s: number, i: any) => s + (Number(i.currentProportionPct) || 0),
        0,
      ),
      weightedPreviousProgress:
        totalConstructionValue > 0
          ? (totalPreviousPropertyValue / totalConstructionValue) * 100
          : 0,
      weightedCurrentProgress:
        totalConstructionValue > 0 ? (totalCurrentPropertyValue / totalConstructionValue) * 100 : 0,
      totalPreviousPropertyValue,
      totalCurrentPropertyValue,
    };
  }, [computedSubItems]);

  const summaryCurrentValue = useMemo(
    () =>
      hasOwnValueBase
        ? roundBaht(totalValue * ((summary?.summaryCurrentProgressPct ?? 0) / 100))
        : totalValue,
    [hasOwnValueBase, totalValue, summary?.summaryCurrentProgressPct],
  );

  // Derived rather than read from summaryPreviousValue: that column is computed here for display
  // and never written back into the form, so what persists is 0. The percentage is bound to a real
  // input and does persist — the same reason the server derives its figures from the percentage.
  const summaryPreviousValue = useMemo(
    () =>
      hasOwnValueBase
        ? roundBaht(totalValue * ((summary?.summaryPreviousProgressPct ?? 0) / 100))
        : totalValue,
    [hasOwnValueBase, totalValue, summary?.summaryPreviousProgressPct],
  );

  // Progress is read off the mode flag, never off the money: without a value base there is no ratio
  // to take, and a condo whose appraised value has not been set yet would otherwise report 0%
  // however much progress the inspector entered.
  const overallProgress = useMemo(() => {
    if (enterDetail) {
      return hasOwnValueBase && totalValue > 0
        ? (grandTotal.totalCurrentPropertyValue / totalValue) * 100
        : grandTotal.totalCurrentProportion;
    }
    return summary?.summaryCurrentProgressPct ?? 0;
  }, [
    enterDetail,
    hasOwnValueBase,
    grandTotal.totalCurrentProportion,
    totalValue,
    grandTotal.totalCurrentPropertyValue,
    summary?.summaryCurrentProgressPct,
  ]);

  // Copy from another property
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const copyBtnRef = useRef<HTMLButtonElement>(null);

  const otherBuildingProperties = useMemo(
    () => buildingProperties.filter(p => p.id !== propertyId),
    [buildingProperties, propertyId],
  );

  const handleCopyFrom = async (source: PropertyItem) => {
    setIsCopyOpen(false);
    setIsCopying(true);
    try {
      const endpoint = getDetailEndpoint(source.type) ?? 'building-detail';
      const { data } = await axios.get(
        `/appraisals/${appraisalId}/properties/${source.id}/${endpoint}`,
      );
      const ci = data?.constructionInspection;
      if (!ci) {
        setIsCopying(false);
        return;
      }
      const mapped = mapConstructionInspectionResponseToForm(ci);
      // Set sub-items with id: null (new copies)
      const copiedSubItems = (mapped.constructionSubItems ?? []).map((item: any) => ({
        ...item,
        id: null,
      }));
      // Clear document fields (source-specific)
      const copiedSummary = {
        ...mapped.constructionSummary,
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
      // Fetch failed
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
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="clipboard-check" style="solid" className="size-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Construction Inspection</h2>
            {inspectionNumber != null && (
              <span className="px-2 py-0.5 text-[10px] font-semibold text-primary bg-primary/10 rounded-full">
                {t('constructionInspection.inspectionRound', { n: inspectionNumber })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Copy From Dropdown */}
            {!readOnly && !ciMode && otherBuildingProperties.length > 0 && (
              <div className="relative">
                <button
                  ref={copyBtnRef}
                  type="button"
                  onClick={() => setIsCopyOpen(!isCopyOpen)}
                  disabled={isCopying}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 disabled:opacity-50 transition-all"
                >
                  {isCopying ? (
                    <Icon name="spinner" style="solid" className="size-3 animate-spin" />
                  ) : (
                    <Icon name="copy" style="regular" className="size-3" />
                  )}
                  Copy from
                </button>
                {isCopyOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsCopyOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[260px] max-h-60 overflow-y-auto">
                      <div className="px-3 pb-1.5 mb-1 border-b border-gray-100">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Copy construction data from
                        </span>
                      </div>
                      {otherBuildingProperties.map(prop => (
                        <button
                          key={prop.id}
                          type="button"
                          onClick={() => handleCopyFrom(prop)}
                          className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all"
                        >
                          <Icon
                            name="building"
                            style="solid"
                            className="size-3 text-gray-400 flex-shrink-0"
                          />
                          <span className="truncate font-medium text-xs">{prop.address}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Property Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2.5 text-sm pl-3 pr-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all"
              >
                <span className="inline-block size-2 rounded-full bg-amber-400 ring-2 ring-amber-100" />
                <span className="text-gray-700 max-w-[180px] truncate font-medium text-xs">
                  {currentProperty?.address || 'Select Property'}
                </span>
                <Icon
                  name="chevron-down"
                  style="solid"
                  className={`size-3 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isDropdownOpen && buildingProperties.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-20 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[260px] max-h-60 overflow-y-auto">
                    <div className="px-3 pb-1.5 mb-1 border-b border-gray-100">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Building Properties
                      </span>
                    </div>
                    {buildingProperties.map(prop => (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() => handlePropertySelect(prop)}
                        className={`flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm transition-all ${
                          prop.id === propertyId
                            ? 'bg-primary/5 text-primary'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`inline-block size-2 rounded-full flex-shrink-0 ${
                            prop.id === propertyId
                              ? 'bg-primary ring-2 ring-primary/20'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span className="truncate font-medium text-xs">{prop.address}</span>
                        {prop.id === propertyId && (
                          <Icon
                            name="check"
                            style="solid"
                            className="size-3 text-primary ml-auto flex-shrink-0"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <div className="px-5 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Total Value
            </div>
            <div className="text-base font-bold text-gray-900">
              {formatNumber(totalValue, 2)}{' '}
              <span className="text-xs font-normal text-gray-400">Baht</span>
            </div>
          </div>
          <div className="px-5 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Current Value
            </div>
            <div className="text-base font-bold text-primary">
              {formatNumber(
                enterDetail ? grandTotal.totalCurrentPropertyValue : summaryCurrentValue,
                2,
              )}{' '}
              <span className="text-xs font-normal text-gray-400">Baht</span>
            </div>
          </div>
          <div className="px-5 py-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
              Overall Progress
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-primary/80 to-primary"
                  style={{ width: `${Math.min(overallProgress, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gray-700 tabular-nums">
                {formatNumber(overallProgress, 1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Toggle + Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-5">
          <Toggle
            label="Enter Construction Detail"
            options={['No', 'Yes']}
            checked={enterDetail}
            onChange={checked =>
              setValue('constructionEnterDetail', checked, { shouldDirty: true })
            }
            disabled={readOnly || ciMode}
            size="sm"
          />
        </div>

        {enterDetail ? (
          <ConstructionDetailTable
            totalValue={totalValue}
            workGroups={workGroups}
            computedSubItems={computedSubItems}
            categorySubtotals={categorySubtotals}
            grandTotal={grandTotal}
            onAddSubItem={handleAddSubItem}
            onUpdateSubItem={handleUpdateSubItem}
            onDeleteSubItem={handleDeleteSubItem}
            readOnly={readOnly}
          />
        ) : (
          <ConstructionSummaryForm
            totalValue={totalValue}
            summary={summary}
            summaryCurrentValue={summaryCurrentValue}
            summaryPreviousValue={summaryPreviousValue}
            onUpdateSummary={(field, value) =>
              setValue(`constructionSummary.${field}`, value, { shouldDirty: true })
            }
            readOnly={readOnly}
          />
        )}

        {/* Remark sits outside the mode branch — it is captured in both modes. */}
        <div className="mt-5">
          <ConstructionRemarkField
            value={remark}
            onChange={value => setValue('constructionRemark', value, { shouldDirty: true })}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
