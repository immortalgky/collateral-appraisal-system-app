import { zodResolver } from '@hookform/resolvers/zod';
import { useController, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormProvider } from '@/shared/components/form/FormProvider';
import {
  CostMachineFormSchema,
  isMachineRowLocked,
  type CostMachineFormType,
} from '../schemas/costMachineForm';
import { CostMachineSection, type MachineryItem, type MachineryRowFormValue } from './CostMachineSection';
import { RemarkField } from './CostMachineForm';
import { KvRow } from './KvRow';
import toast from 'react-hot-toast';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon } from '@/shared/components';
import { NumberInput } from '@/shared/components/inputs';
import { initializeCostMachineForm } from '../adapters/initializeCostMachineForm';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMachineCostItems, useResetMethod, useSaveMachineCostItems } from '../api';
import type { SaveMachineCostItemInput } from '../api';
import { pricingAnalysisKeys } from '../api/queryKeys';
import DataErrorState from '@/shared/components/DataErrorState';
import type { MarketComparableDetailType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { MethodTopBarPortal } from './MethodTopBarPortal';
import { MethodTabs } from './MethodTabs';
import { DenseProvider } from './table/RHFInputCell';
import { fmt } from '../domain/formatters';

interface CostMachinePanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  propertiesMap?: Record<string, Record<string, unknown>>;
  savedMethodValue?: number | null;
  /** Passed through for the market-reference launcher */
  marketSurveys?: MarketComparableDetailType[];
  templateList?: TemplateDtoType[] | undefined;
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

/** First of the candidates that has actual text in it. */
const firstNonBlank = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text !== '') return text;
  }
  return null;
};

export function CostMachinePanel({
  activeMethod,
  propertiesMap,
  marketSurveys,
  templateList,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: CostMachinePanelProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { pricingAnalysisId, methodId } = activeMethod ?? {};
  const queryClient = useQueryClient();
  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);
  const resetMutation = useResetMethod();
  const saveMutation = useSaveMachineCostItems();

  // Fetch saved machine cost items from API
  const {
    data: savedData,
    isPending: isLoadingCostItems,
    isError: isCostItemsError,
    refetch: refetchCostItems,
  } = useGetMachineCostItems(pricingAnalysisId, methodId);

  // Build machinery items from propertiesMap (all MAC-type properties in the group)
  const machineryItems: MachineryItem[] = useMemo(() => {
    if (!propertiesMap) return [];
    return Object.entries(propertiesMap)
      .filter(([, detail]) => (detail as any).propertyType === 'MAC')
      .map(([propertyId, detail]) => {
        const d = detail as Record<string, any>;
        return {
          appraisalPropertyId: String(d.propertyId ?? propertyId),
          quantity: d.quantity != null ? Number(d.quantity) : null,
          // The machinery form writes PropertyName now; MachineName only survives on rows created
          // before that. Emptiness decides, not nullness: saving a legacy row through the new form
          // writes PropertyName = '', and a null test would let that blank hide the name still
          // sitting in MachineName. Same rule as the report's
          // COALESCE(NULLIF(PropertyName,''), NULLIF(MachineName,'')).
          machineName: firstNonBlank(d.propertyName, d.machineName),
          registrationNumber: d.registrationNumber != null ? String(d.registrationNumber) : null,
          manufacturer: d.manufacturer != null ? String(d.manufacturer) : null,
          conditionUse: d.conditionUse != null ? String(d.conditionUse) : null,
          yearOfManufacture: d.yearOfManufacture != null ? Number(d.yearOfManufacture) : null,
          // From GET /appraisals/{id}/properties/{pid}/machinery-detail, where IsPriceCertified is
          // a non-nullable bool defaulting to true — so in practice the null branch only covers a
          // response that never arrived. Kept as null rather than coerced to false: a missing
          // answer is not the appraiser saying no, and only an explicit no locks the row.
          isPriceCertified: d.isPriceCertified != null ? Boolean(d.isPriceCertified) : null,
        };
      });
  }, [propertiesMap]);

  const methods = useForm<CostMachineFormType>({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(CostMachineFormSchema),
  });

  const {
    control,
    handleSubmit,
    formState: { isDirty },
    getValues,
    reset,
  } = methods;

  const isReadOnly = usePageReadOnly();
  // Stable id so the top-bar Save button (portaled outside this <form> via
  // MethodTopBarPortal) still submits it natively — see WQSPanel.tsx for why.
  const formId = 'mc-panel-form';

  // Top-bar figure: sum of each row's already-computed FMV. This does NOT recompute the
  // formula (RCN×P×F×E lives only in useRowComputedValues inside CostMachineSection) —
  // it just totals the values that hook already put on each row, the same trivial
  // reduce CostMachineSection itself does for its own footer total.
  const machineryCosts = useWatch({ control, name: 'machineryCosts' }) as
    | MachineryRowFormValue[]
    | undefined;
  const totalFmv = (machineryCosts ?? []).reduce((sum, row) => sum + (row?.fmv ?? 0), 0);
  const totalQuantity = (machineryCosts ?? []).reduce(
    (sum, row) => sum + (row?.machine?.quantity ?? 0),
    0,
  );
  const totalRcn = (machineryCosts ?? []).reduce((sum, row) => sum + (row?.rcn ?? 0), 0);

  // The appraiser's override of the table's FMV total (mock:2571's `mcTotOv`) — a real
  // form field now, same as `indicatedValue` on leaseholdForm.ts/profitRentForm.ts/
  // hypothesisForm.ts: `SaveMachineCostItemsRequest.cs` already accepts it
  // (SetIndicatedValue/SyncMethodValueWithIndicatedValue), the FE just wasn't sending
  // it. Being a real field also means `reset()` clears it and `isDirty` covers it for
  // free — a bare `useState` gave neither. `field.value` stays `null` until the
  // appraiser types something; NumberInput's own onChange already reports an emptied
  // box as `null`, not `0` (see NumberInput.tsx's onChange type), so this never turns
  // "cleared the box" into "saved a real zero".
  const { field: indicatedValueField } = useController({ control, name: 'indicatedValue' });

  // How far the appraiser's override sits from the table's own FMV total, which is what
  // decides between the formula hint and the แก้เอง badge below. Null means "not
  // overridden, use the computed total" (costMachineForm.ts:114), and mock:1636 keys its
  // un-edited hint off exactly that null rather than off a comparison.
  //
  // The extra `!== totalFmv` test, which the mock doesn't have: an override that happens
  // to equal the total is reported as NOT edited here. mock:1638 would render
  // "ต่างจากที่คำนวณ" with an empty delta after it in that case (its `sign()` returns ''
  // at 0), and there is nothing for the appraiser to act on — the number on screen is the
  // computed one. This is also what the sibling summaries do; their `editedBadge`
  // (WQSAdjustFinalValueSection.tsx:355) takes its un-edited branch on `delta === 0`, not
  // on the field being unset, so machinery agrees with them on the degenerate case.
  const overrideDelta =
    indicatedValueField.value == null ? 0 : Number(indicatedValueField.value) - totalFmv;

  // Initialize form once when machine list and saved data are ready
  const isInitialized = useRef(false);
  useEffect(() => {
    if (savedData !== undefined && !isInitialized.current) {
      isInitialized.current = true;
      initializeCostMachineForm({
        machineryItems,
        savedItems: savedData?.items,
        remark: savedData?.remark ?? '',
        indicatedValue: savedData?.indicatedValue ?? null,
        reset,
      });
    }
  }, [machineryItems, savedData]);

  useEffect(() => {
    onCalculationMethodDirty(isDirty);
  }, [isDirty, onCalculationMethodDirty]);

  const handleOnSubmit = async () => {
    if (!pricingAnalysisId || !methodId) return;

    const data = getValues();

    // Map form rows to API request format
    const items: SaveMachineCostItemInput[] = data.machineryCosts.map((row, idx) => ({
      id: row.id ?? null,
      appraisalPropertyId: row.appraisalPropertyId,
      displaySequence: idx + 1,
      // `?? null` so an empty cell is sent as an explicit null rather than dropped from the JSON.
      // RCN and life span are sent as they are even on a locked row: those are the appraiser's own
      // figures and re-certifying the price should find them still there.
      rcnReplacementCost: row.rcn ?? null,
      lifeSpanYears: row.lifeSpan ?? null,
      conditionFactor: row.conditionFactor ?? 0,
      functionalObsolescence: row.functionalObsolescence ?? 1,
      economicObsolescence: row.economicObsolescence ?? 1,
      // The value, though, is null for a locked row — that is the whole point of the lock. The
      // server sums only items whose FairMarketValue has a value (MachineryCostCalculationService),
      // so a null here drops the machine out of the group total while leaving its inputs intact.
      fairMarketValue: isMachineRowLocked(row.machine) ? null : (row.fmv ?? null),
      marketDemandAvailable: row.marketDemand === 'Y',
      notes: row.notes || null,
    }));

    try {
      const result = await saveMutation.mutateAsync({
        pricingAnalysisId,
        methodId,
        items,
        remark: data.remark,
        indicatedValue: data.indicatedValue,
      });

      if (activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue: data.indicatedValue ?? result.totalFmv,
        });
      }
      toast.success(t('toasts.saved'));
    } catch {
      toast.error(t('toasts.saveFailed'));
    }
  };

  /** reset handler */
  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    if (!pricingAnalysisId || !methodId) return;
    try {
      await resetMutation.mutateAsync({
        pricingAnalysisId,
        methodId,
      });
      // Invalidate cached saved data so re-init uses fresh state
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.machineCostItems(pricingAnalysisId, methodId),
      });
      isInitialized.current = false;
      initializeCostMachineForm({ machineryItems, reset });
      toast.success(t('toasts.resetSuccess'));
    } catch {
      toast.error(t('toasts.failedReset'));
    }
  };

  return (
    <FormProvider methods={methods} schema={CostMachineFormSchema}>
      <MethodTopBarPortal>
        <div className="flex flex-col items-end leading-tight shrink-0 px-1">
          <span className="text-[10px] text-gray-400">{t('finalValue.indicatedValue')}</span>
          <span className="text-sm font-semibold text-primary tabular-nums">
            {fmt(Number(indicatedValueField.value ?? totalFmv) || 0)}
          </span>
        </div>
        {!isReadOnly && (
          <>
            <span className="w-px h-5 bg-gray-200 shrink-0" />
            <Button
              variant="ghost"
              type="button"
              onClick={onCancelCalculationMethod}
              disabled={saveMutation.isPending}
              className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
            >
              {t('footer.cancel')}
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={handleOnReset}
              disabled={saveMutation.isPending}
              title={t('footer.reset')}
              aria-label={t('footer.reset')}
              className="h-[28px]! w-[28px]! px-0! py-0! rounded-[7px]! text-red-500 hover:text-red-600"
            >
              <Icon name="arrow-rotate-left" style="solid" className="size-[13px]" />
            </Button>
            <Button
              type="submit"
              form={formId}
              isLoading={saveMutation.isPending}
              disabled={saveMutation.isPending}
              className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
            >
              {!saveMutation.isPending && (
                <Icon style="solid" name="check" className="size-[13px] mr-[6px]" />
              )}
              {t('footer.save')}
            </Button>
          </>
        )}
      </MethodTopBarPortal>
      <form
        id={formId}
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        className="flex flex-col h-full min-h-0 gap-4"
      >
        <MethodTabs
          tabs={[
            {
              id: 'table',
              label: t('costMachine.tabs.table'),
              content: isCostItemsError ? (
                <DataErrorState
                  title={t('costMachine.loadFailed')}
                  onRetry={refetchCostItems}
                  variant="inline"
                />
              ) : (
                <DenseProvider value={true}>
                  <CostMachineSection
                    machineryItems={machineryItems}
                    isLoading={isLoadingCostItems}
                    methodId={methodId}
                    marketSurveys={marketSurveys}
                    templateList={templateList}
                  />
                </DenseProvider>
              ),
            },
            {
              id: 'summary',
              label: t('costMachine.tabs.summary'),
              // mock:2569-2571 — four rows (Quantity, Total RCN, Total FMV, editable
              // Indicated Value), same `.kv` card shape WQSAdjustFinalValueSection uses,
              // beside its own Remark card rather than the Remark field standing alone.
              // `py-[14px] px-[16px]` is the mock's own `.summary` rule (mock:585) — the
              // inset WQS/SAG/DC already carry (WQSAdjustFinalValueSection.tsx:484,
              // SaleAdjustmentGridForm.tsx:161, DirectComparisonForm.tsx:145). MethodTabs'
              // shared tab body has no horizontal padding for any tab, so without this the
              // cards sat flush against the top and left edges while every other method's
              // floated (user: "เพิ่ม padding ให้การ์ดไม่ให้ติดซ้ายหรือบน แบบสรุปที่อื่นๆ").
              // `grid-cols-2` stays: this tab has two cards, the summary and Remark, which
              // is the same two-card shape the other three methods' summary tabs have.
              content: (
                <div className="grid grid-cols-2 items-start gap-[16px] py-[14px] px-[16px]">
                  <div className="min-w-0 border border-[#e3e9e8] rounded-[10px] overflow-hidden">
                    <h4 className="m-0 px-[12px] py-[8px] text-[12.5px] font-semibold text-gray-800 bg-[#f8fafa] border-b border-[#e3e9e8]">
                      {t('costMachine.summary.title')}
                    </h4>
                    {/* `KvRow` rather than the hand-rolled flex rows this replaced — the same
                        shared row WQS/SAG/DC's summary cards use, so machinery's numbers and
                        units land on the same x as theirs instead of wherever each row's own
                        `w-40` happened to end (user: "ให้ข้อมูลในการ์ดตรงค่าต่างๆ ชิดขวาเหมือนที่อื่นๆ").
                        No padding or gap on this container: every row brings its own per-cell
                        `px-[12px]` and its own bottom border, so adding them here would double
                        the indent and push the separators apart. */}
                    <div className="flex flex-col text-[12.5px]">
                      <KvRow
                        label={t('costMachine.summary.quantity')}
                        value={
                          <span className="font-semibold text-gray-800">
                            {totalQuantity.toLocaleString()}
                          </span>
                        }
                        unit={t('costMachine.summary.quantityUnit')}
                      />
                      <KvRow
                        label={t('costMachine.summary.totalRcn')}
                        value={<span className="font-semibold text-gray-800">{fmt(totalRcn)}</span>}
                        unit={t('costMachine.summary.baht')}
                      />
                      <KvRow
                        label={t('costMachine.summary.totalFmvFromTable')}
                        value={<span className="font-semibold text-gray-800">{fmt(totalFmv)}</span>}
                        unit={t('costMachine.summary.baht')}
                      />
                      <KvRow
                        label={
                          <span className="flex flex-col">
                            <span className="text-[14px] font-semibold text-[#0f766e]">
                              <span className="mr-1 text-gray-400">=</span>
                              {t('costMachine.summary.indicatedValueLabel')}
                            </span>
                            <span className="text-[10.5px] text-gray-400">
                              {t('costMachine.summary.indicatedValueSubLabel')}
                            </span>
                          </span>
                        }
                        value={
                          // No `w-[206px]` wrapper any more: the row's value column is 230px
                          // wide and each cell carries `px-[12px]`, so its content box is that
                          // same 206px, and NumberInput's own `fullWidth` (default true) already
                          // puts `w-full` on both its wrapper and the input. The hard-coded width
                          // would now be a second source of truth for the same number.
                          <NumberInput
                            name={indicatedValueField.name}
                            ref={indicatedValueField.ref}
                            value={indicatedValueField.value ?? totalFmv}
                            onChange={e => indicatedValueField.onChange(e.target.value)}
                            onBlur={indicatedValueField.onBlur}
                            decimalPlaces={2}
                            maxIntegerDigits={15}
                            disabled={isReadOnly}
                            // Green — same `.kv .final .in` palette as WQSAdjustFinalValueSection's
                            // Indicated Value inputs (mock:587-589).
                            className="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold! text-[12.5px]! h-[26px]! py-0! px-[5px]! rounded-[4px]!"
                          />
                        }
                        hint={
                          // mock:1636-1638's `.ovh` line for `mcTotOv`, the same two-branch
                          // slot WQS/SAG/DC render through their own `editedBadge`: the
                          // formula that produced the figure while it is still the computed
                          // one, and once it has been typed over, the แก้เอง badge with the
                          // signed delta plus a link back to the computed value. Without it
                          // an override was invisible — the user's screenshot showed
                          // 123,123,123,123,123.00 sitting where the table totals 4,750,000.00
                          // with nothing on screen saying it had been changed.
                          //
                          // Built here rather than by calling the siblings' `editedBadge`:
                          // that helper is an `RHFInputCell inputType="display"`, which
                          // exists so those cards can read a field they don't otherwise
                          // subscribe to and re-derive a SEEDED value through `roundToThousand`.
                          // Neither applies here. Both operands are already live in this
                          // render — `indicatedValueField.value` from useController and
                          // `totalFmv` from useWatch — and machinery's computed value is a
                          // plain sum with no rounding step, so the helper's un-edited branch
                          // (always `comparativeAnalysis.roundingHint`, "ระบบปัดหลักพันจาก …")
                          // would state a rounding that never happened. The three strings and
                          // the markup are the shared ones; only the plumbing differs.
                          overrideDelta !== 0 ? (
                            <span className="text-[10.5px] text-gray-400 inline-flex items-center gap-1 flex-wrap justify-end">
                              <span className="font-semibold text-[#b45309]">
                                {t('comparativeAnalysis.editedLabel')}
                              </span>
                              {t('comparativeAnalysis.differsFromComputed', {
                                value: `${overrideDelta > 0 ? '+' : '−'}${fmt(Math.abs(overrideDelta))}`,
                              })}
                              {!isReadOnly && (
                                <>
                                  <span>·</span>
                                  {/* Writes null, not `totalFmv` — mock:4052 resets these
                                      overrides with `state[k] = null` too. Null is the field's
                                      own "not overridden" state, so the box goes back to
                                      tracking the live table total (`value ?? totalFmv` above)
                                      and a later edit to any machine row keeps flowing through.
                                      Writing the number instead would freeze today's total in
                                      as a permanent override that merely looks un-edited. */}
                                  <button
                                    type="button"
                                    className="text-primary hover:underline"
                                    onClick={() => indicatedValueField.onChange(null)}
                                  >
                                    {t('comparativeAnalysis.useComputedValue')}
                                  </button>
                                </>
                              )}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-gray-400">
                              {t('costMachine.summary.computedHint')}
                            </span>
                          )
                        }
                        unit={t('costMachine.summary.baht')}
                      />
                    </div>
                  </div>
                  <div className="min-w-0 border border-[#e3e9e8] rounded-[10px] overflow-hidden">
                    <h4 className="m-0 px-[12px] py-[8px] text-[12.5px] font-semibold text-gray-800 bg-[#f8fafa] border-b border-[#e3e9e8]">
                      {t('costMachine.summary.remarkTitle')}
                    </h4>
                    <div className="px-[12px] py-3">
                      <RemarkField />
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
        <ConfirmDialog
          isOpen={isShowResetDialog}
          onClose={() => setIsShowResetDialog(false)}
          onConfirm={handleOnConfirmReset}
          message={t('confirm.resetMethod')}
        />
      </form>
    </FormProvider>
  );
}
