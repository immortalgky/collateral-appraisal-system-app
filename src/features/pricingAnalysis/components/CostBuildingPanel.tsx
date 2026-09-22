import { useTranslation } from 'react-i18next';
import { Button, Icon } from '@/shared/components';
import { BuildingCostTable } from './BuildingCostTable';
import { DenseProvider, RHFInputCell } from './table/RHFInputCell';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFormContext, useWatch } from 'react-hook-form';
import { FormProvider } from '@/shared/components/form/FormProvider';
import z from 'zod';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { useResetMethod, useUpdateMethodValue } from '../api';
import { useEffect, useMemo, useState } from 'react';
import { fmt } from '../domain/formatters';
import { sumBuildingFinalCostValue } from '../domain/calculation';
import { KpiSummaryStrip, type KpiCard } from './KpiSummaryStrip';
import { KvRow } from './KvRow';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { MethodTopBarPortal } from './MethodTopBarPortal';
import { MethodTabs } from './MethodTabs';

type CostBuildingFormType = z.infer<typeof costBuildingDto>;

const costBuildingDto = z
  .object({
    appraisalPriceRounded: z.number(),
  })
  .passthrough();

interface CostBuldingPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  properties: Record<string, unknown>[] | undefined;
  savedMethodValue?: number | null;
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function CostBuildingPanel({
  activeMethod,
  properties,
  savedMethodValue,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: CostBuldingPanelProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { methodId, methodType } = activeMethod ?? {};

  // Every building type in the group, not just B/LSB — a land-and-building group can
  // also carry LB (lease-agreement building) and LS (land with a structure) buildings,
  // which the backend already returns but this filter used to drop silently.
  const COLLATERAL_TYPES_WITH_BUILDING = ['B', 'LB', 'LSB', 'LS'];
  const buildingProperties = useMemo(
    () =>
      properties?.filter(p => COLLATERAL_TYPES_WITH_BUILDING.includes(p.propertyType as string)) ??
      [],
    [properties],
  );
  const hasBuilding = buildingProperties.length > 0;

  type CostTotals = {
    totalBuildingArea: number;
    totalPriceBeforeDepreciation: number;
    totalPriceDepre: number;
  };

  const { totalBuildingArea, totalPriceBeforeDepreciation, totalPriceDepre } =
    useMemo<CostTotals>(() => {
      return buildingProperties.reduce<CostTotals>(
        (total, property) => {
          const depreciationDetails = (property.depreciationDetails as any[]) ?? [];
          const { totalBuildingArea, totalPriceBeforeDepreciation, totalPriceDepre } =
            depreciationDetails.reduce(
              (acc, curr) => {
                return {
                  totalBuildingArea: acc.totalBuildingArea + Number(curr.area || 0),
                  totalPriceBeforeDepreciation:
                    acc.totalPriceBeforeDepreciation +
                    Number(curr.area || 0) * Number(curr.pricePerSqMBeforeDepreciation || 0),
                  totalPriceDepre: acc.totalPriceDepre + Number(curr.priceDepreciation || 0),
                };
              },
              {
                totalBuildingArea: 0,
                totalPriceBeforeDepreciation: 0,
                totalPriceDepre: 0,
              },
            );

          return {
            totalBuildingArea: (total.totalBuildingArea += totalBuildingArea),
            totalPriceBeforeDepreciation: (total.totalPriceBeforeDepreciation +=
              totalPriceBeforeDepreciation),
            totalPriceDepre: (total.totalPriceDepre += totalPriceDepre),
          };
        },
        {
          totalBuildingArea: 0,
          totalPriceBeforeDepreciation: 0,
          totalPriceDepre: 0,
        },
      );
    }, [buildingProperties]);

  // The group's Building Cost Value: per building, the appraiser's keyed override (the
  // `finalCostValueOverride` column keeps its name — the label over it on the property form
  // is Building Cost Value), else that building's schedule total rounded to the nearest
  // 1,000. One shared implementation, now also called by WQS/SAG/DC's summary cards,
  // mirroring the backend's PricingPropertyDataService.BuildingCostSql.
  //
  // This is the figure that gets SAVED as the method value and that pricing reads back, so
  // it is the one this panel shows. The raw Σ priceAfterDepreciation it used to display is
  // still the sum of the rows in the table below, but it is not the number of record — the
  // two differ by the per-building rounding residue, which is exactly what lit this panel's
  // own diff badge on a group nobody had touched.
  const totalFinalCostValue = useMemo(
    () => sumBuildingFinalCostValue(buildingProperties),
    [buildingProperties],
  );
  // Depreciation as a share of the BEFORE-depreciation total — mock:1771 computes this
  // KPI as `T[2] / T[1]`, depreciation over RCN before depreciation. This divided by the
  // AFTER-depreciation total instead, a smaller denominator, so the figure read high on
  // every appraisal: 400,000 of depreciation against a 1,400,000 RCN showed as 40%
  // rather than 28.57%. It also printed `NaN%` for a group with no depreciation schedule
  // at all (0/0), which the mock avoids with the same zero guard inline (`T[1] ? … : 0`).
  // The guard still earns its keep now that this figure rides in the KPI's value instead
  // of its label: 0/0 is NaN, and `toFixed` renders that as "NaN", so without it the card
  // would read "0.00 (NaN%)".
  // One decimal, not the shared `fmt`'s fixed two: the mock formats this one as
  // `fmt(pct, 1)` (mock:1772) because it is a percentage, not money. The zero guard stays
  // for the reason given above.
  const totalDeprePct = (
    totalPriceBeforeDepreciation ? (totalPriceDepre / totalPriceBeforeDepreciation) * 100 : 0
  ).toFixed(1);

  const methods = useForm<CostBuildingFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(costBuildingDto),
  });

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    formState: { isDirty },
  } = methods;

  const isReadOnly = usePageReadOnly();
  // Stable id so the top-bar Save button (portaled outside this <form> via
  // MethodTopBarPortal) still submits it natively — see WQSPanel.tsx for why.
  const formId = 'bc-panel-form';
  const indicatedValue = useWatch({ control, name: 'appraisalPriceRounded' });

  const saveMutation = useUpdateMethodValue();
  const resetMutation = useResetMethod();

  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    if (!activeMethod?.pricingAnalysisId || !methodId) return;
    try {
      await resetMutation.mutateAsync({
        pricingAnalysisId: activeMethod.pricingAnalysisId,
        methodId,
      });
      reset({ appraisalPriceRounded: totalFinalCostValue });
      toast.success(t('toasts.resetSuccess'));
    } catch {
      toast.error(t('toasts.failedReset'));
    }
  };

  /** Form handler — skips full Zod validation so we can save factors/scores independently */
  const handleOnSubmit = async () => {
    if (!activeMethod?.pricingAnalysisId || !methodId) {
      toast.error(t('toasts.missingIds'));
      return;
    }

    try {
      const request = getValues();

      await saveMutation.mutateAsync({
        id: activeMethod.pricingAnalysisId,
        methodId,
        request: { methodValue: request.appraisalPriceRounded },
      });

      if (activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue: request.appraisalPriceRounded,
        });
      }
      toast.success(t('toasts.saved'));
      reset(request);
    } catch {
      toast.error(t('toasts.saveFailed'));
    }
  };

  // Single init effect — runs once on mount or when method changes
  useEffect(() => {
    if (isGenerated) return;
    if (!methodId || !methodType || !properties) return;

    if (savedMethodValue != null && savedMethodValue !== 0) {
      // Priority 1: restore saved value
      reset({ appraisalPriceRounded: savedMethodValue });
    } else if (hasBuilding) {
      // Priority 2: seed from calculated total
      reset({ appraisalPriceRounded: totalFinalCostValue });
    }

    setIsGenerated(true);
  }, [
    isGenerated,
    methodId,
    methodType,
    properties,
    savedMethodValue,
    hasBuilding,
    totalFinalCostValue,
    reset,
  ]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    onCalculationMethodDirty(isDirty);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, onCalculationMethodDirty]);

  return (
    <FormProvider methods={methods} schema={costBuildingDto}>
      <MethodTopBarPortal>
        <div className="flex flex-col items-end leading-tight shrink-0 px-1">
          <span className="text-[10px] text-gray-400">{t('finalValue.indicatedValue')}</span>
          <span className="text-sm font-semibold text-primary tabular-nums">
            {fmt(Number(indicatedValue) || 0)}
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
            {(!!savedMethodValue || saveMutation.isSuccess) && (
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
            )}
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
              label: t('costBuilding.tabs.table'),
              // mock:3499/3502 — the strip belongs in the tab strip's right-hand toolbar,
              // not above the table. `tools` is that slot (MethodTabs.tsx:20): it renders
              // only while this tab is active, and MethodTabs composes the toolbar as
              // tools → nav slot → toolsAfterNav (MethodTabs.tsx:83-85) under `ml-auto`,
              // which is the mock's `.grow` + `.tools` arrangement AND its order — the
              // mock appends navHtml() after the kpis (mock:3502 then :3503).
              //
              // So nothing here touches MethodTabsNavSlotCtx. The nav strip's slot stays
              // its own: it is empty on this tab anyway, because BC's table mounts
              // ScrollableTableContainer without a `columnNavSelector`
              // (BuildingCostTable.tsx:788) and the container only portals a strip when it
              // has one (:233). If that table ever gains column nav, the chips land to the
              // RIGHT of these figures, which is the order the mock has.
              tools: (
                <KpiSummaryStrip
                  variant="flat"
                  cards={
                    [
                      {
                        // The only card carrying a unit — mock:2704 gives `ตร.ม.` to the
                        // first and nothing to the other three, so the `฿` this strip
                        // used to repeat on the three money cards is gone.
                        label: t('costBuilding.summary.totalBuildingArea'),
                        value: totalBuildingArea,
                        suffix: t('costBuilding.summary.areaUnit'),
                      },
                      {
                        label: t('costBuilding.summary.rcnBeforeDepreciation'),
                        value: totalPriceBeforeDepreciation,
                        secondary: true,
                      },
                      {
                        // The percentage belongs to the figure, so it rides in the value
                        // (`1,234.00 (12.5%)`, mock:1772) rather than in the label, where
                        // this strip used to print it.
                        label: t('costBuilding.summary.totalDepreciation'),
                        value: totalPriceDepre,
                        note: `(${totalDeprePct}%)`,
                        secondary: true,
                      },
                      {
                        // Names the quantity it now carries: the override-aware,
                        // per-building-rounded total, not the raw after-depreciation sum
                        // it used to show. This is the mock's fourth KPI (mock:2704, where
                        // it still reads `รวม Final Cost Value`) — the screen now calls it
                        // Building Cost Value, the name the property form and
                        // PricingPropertyDataService.BuildingCostSql already use for this
                        // same figure, and the property form is the only place it can be
                        // edited. `primary` is the mock's `.kpi.pri` — darker ink, not a
                        // colour. Never `secondary`: this is the method's own result. Same
                        // key as the table's own grand-total footer (BuildingCostTable.tsx),
                        // deliberately: same number, same name, twice on one screen.
                        label: t('costBuilding.table.totalBuildingCostValueLabel'),
                        value: totalFinalCostValue,
                        primary: true,
                      },
                    ] satisfies KpiCard[]
                  }
                />
              ),
              content: (
                // No wrapper at all. Once the KPI strip moved up into the tab strip this
                // div held a single child, and the inset it carried is the padding band
                // the user asked to remove — a flex column with a dead `gap-4` and no
                // padding, around one element, is not worth keeping.
                //
                // Full bleed is the mock's own arrangement, not just the absence of a
                // choice: `.scwrap` (mock:262) sits directly under the steps bar with no
                // inset, and the table no longer carries a frame of its own either
                // (BuildingCostTable.tsx:781-788). MethodTabs' tab body supplies
                // `pb-[16px]` at the bottom and nothing at the top (MethodTabs.tsx:88), so
                // what separates the table from the tab strip's border is the table's own
                // header band — see the handoff note on that.
                //
                // The summary tab KEEPS its `py-[14px] px-[16px]` (AdjustAppraisalPrice's
                // root). That one is mock:585's `.summary` rule for a 540px card, not a
                // full-width table, so the two tabs are deliberately no longer symmetric —
                // this is not an inconsistency to "restore" later.
                //
                // showProvenance is BC only: the table defaults it to `true` so Profit
                // Rent, which renders the same table through BuildingCostCollapsible,
                // keeps both lines. BC now suppresses the whole provenance cell — user-ruled
                // twice: first the rounding note went, now the override line too, so nothing
                // on this screen distinguishes a hand-keyed figure from one that merely
                // coincides with the rounded total. No exposure today (0 of 241 buildings
                // carry an override); see FinalCostRow's own comment in BuildingCostTable.tsx.
                <BuildingCostTable
                  buildingCost={buildingProperties ?? []}
                  showProvenance={false}
                />
              ),
            },
            {
              id: 'summary',
              label: t('costBuilding.tabs.summary'),
              content: (
                <DenseProvider value={true}>
                  <AdjustAppraisalPrice
                    totalBuildingValue={totalFinalCostValue}
                    buildingCount={buildingProperties.length}
                  />
                </DenseProvider>
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

function AdjustAppraisalPrice({
  totalBuildingValue,
  buildingCount,
}: {
  totalBuildingValue: number;
  buildingCount: number;
}) {
  const { t } = useTranslation('pricingAnalysis');
  const { setValue } = useFormContext();

  // The แก้เอง badge the other four methods carry (WQSAdjustFinalValueSection.tsx:303) —
  // BC was the only one of the five without it. This replaces a `diffBadge` that read a
  // virtual `appraisalDiff` field and drew a bare green/red arrow: an arrow with no word
  // beside it says a number changed without saying who changed it or offering a way back,
  // and its green collided with the accent reserved for a method's own final result. The
  // `appraisalDiff` derived rule went with it — nothing else read that field, and the save
  // payload only ever sends `appraisalPriceRounded`.
  //
  // Local copy, like the other four, rather than a shared export — see the handoff note
  // before a fifth one appears.
  //
  // ONE deliberate deviation from theirs: their un-edited branch prints
  // `comparativeAnalysis.roundingHint` ("Rounded to the nearest thousand from {value}").
  // That sentence would be FALSE here. This figure is Σ per building of
  // (keyed override ?? rounded schedule total), so the rounding happens per building and
  // before the sum — and a building carrying an override was never rounded at all. A
  // group-level "rounded from X" would name an arithmetic this method does not perform.
  // So the un-edited branch shows only the formula line, which is true either way
  // (mock:1634's `= ผลรวม Final Cost Value ทุกหลัง`).
  //
  // `computed` is a plain number rather than a getValues read: unlike WQS's, this value
  // comes from the property schedule above, not from a sibling form field.
  const editedBadge = (editableFieldPath: string, computed: number) => (
    <RHFInputCell
      fieldName={editableFieldPath}
      inputType="display"
      accessor={({ value }) => {
        const delta = (Number(value) || 0) - computed;
        // Untouched — the box still holds exactly what it was seeded with, so name where
        // that number came from instead of flagging a change nobody made.
        if (delta === 0) {
          return (
            <span className="text-[10.5px] text-[#8a96a0]">
              {t('costBuilding.summary.sumOfAllBuildingsHint')}
            </span>
          );
        }
        const sign = delta > 0 ? '+' : '−';
        return (
          <span className="text-[10.5px] text-gray-400 inline-flex items-center gap-1 flex-wrap justify-end">
            <span className="font-semibold text-[#b45309]">
              {t('comparativeAnalysis.editedLabel')}
            </span>
            {t('comparativeAnalysis.differsFromComputed', {
              value: `${sign}${fmt(Math.abs(delta))}`,
            })}
            <span>·</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setValue(editableFieldPath, computed, { shouldDirty: true })}
            >
              {t('comparativeAnalysis.useComputedValue')}
            </button>
          </span>
        );
      }}
    />
  );

  return (
    // `py-[14px] px-[16px]` is the mock's own `.summary` rule (mock:585) — the inset the
    // other four methods already carry (WQSAdjustFinalValueSection.tsx:512,
    // SaleAdjustmentGridForm.tsx:161, DirectComparisonForm.tsx:145,
    // CostMachinePanel.tsx:358). MethodTabs' shared tab body has no horizontal padding
    // for any tab (MethodTabs.tsx:88), so without this the card sits flush against the
    // tab's top and left edges while every other method's floats.
    //
    // No `grid-cols-2` here, unlike all four of those: this tab has ONE card. The mock's
    // `summaryOther` (mock:2658-2661) appends a second panel only for MC (Remark) and
    // PR/LH (Notes); BC's own branch (mock:2629-2630) is the two-row `kv` card by itself,
    // and this panel has no Remark field to pair one with. A two-column grid would leave
    // the right half empty and shrink the card for no reason.
    //
    // `max-w-[540px]` is that single column's own width, not an invented cap: the mock's
    // `.summary` track is `repeat(auto-fit, minmax(440px, 540px))`, so one card renders
    // at 540px rather than stretching the full tab. That is also roughly what each of the
    // siblings' two 50% columns comes to, so this card reads the same size as theirs.
    <div className="py-[14px] px-[16px]">
      <div className="max-w-[540px] min-w-0 border border-[#e3e9e8] rounded-[10px] overflow-hidden">
        {/* mock:586-587's `.panel` / `.panel h4`. `overflow-hidden` on the card is what
            clips this header band to the rounded corners — it fills edge to edge rather
            than floating inside body padding. */}
        <h4 className="m-0 px-[12px] py-[8px] text-[12.5px] font-semibold text-gray-800 bg-[#f8fafa] border-b border-[#e3e9e8]">
          {t('costBuilding.summary.valueByThisMethod')}
        </h4>
        {/* `KvRow` rather than the hand-rolled flex rows this replaced — the same shared
            row the other four methods' summary cards use, so BC's number and unit land on
            the same x as theirs instead of wherever this row's own `w-48`/`w-40` happened
            to end. No padding or gap on this container: every row brings its own per-cell
            `px-[12px]` and its own bottom border, so adding them here would double the
            indent and push the separators apart. */}
        <div className="flex flex-col text-[12.5px]">
          <KvRow
            // The group's Building Cost Value — the override-aware, per-building-rounded
            // total that actually gets saved (see sumBuildingFinalCostValue). It used to be
            // the raw Σ of priceAfterDepreciation, and that gap is what lit the diff badge
            // below on an untouched group: the input under it was seeded from the saved
            // total while this row showed a different one, so the badge was measuring the
            // two against each other rather than measuring the appraiser's edit.
            //
            // mock:2630 is `รวม Final Cost Value (3 หลัง)` — the building count belongs in
            // this label. The words follow the screen-wide rename to Building Cost Value
            // rather than reintroducing the old name, and the count is the same
            // `buildingProperties.length` the filter above already produced.
            //
            // This row must keep showing the figure the input below is SEEDED from. The
            // badge under that input compares the live value against this same number, so
            // the moment the two diverge the badge lights on a group nobody has touched —
            // the precise defect fixed earlier this pass, when this row showed the raw
            // Σ priceAfterDepreciation while the input held the rounded total.
            label={t('costBuilding.summary.totalBuildingCostValueWithCount', {
              count: buildingCount,
            })}
            value={
              <span className="font-semibold text-gray-800">
                {fmt(Number(totalBuildingValue) || 0)}
              </span>
            }
            unit={t('costBuilding.summary.baht')}
          />
          <KvRow
            // mock:594's `.kv .final` — 14px/600 in the accent ink, so the row reads as
            // the method's result rather than as one more plain label.
            //
            // The sub-label is mock:2630's `รวมค่าอาคาร`, naming WHICH quantity this
            // method's result is, the way machinery's card already does.
            label={
              <span className="flex flex-col">
                <span className="text-[14px] font-semibold text-[#0f766e]">
                  {t('finalValue.indicatedValue')}
                </span>
                <span className="text-[10.5px] text-[#8a96a0]">
                  {t('costBuilding.summary.totalBuildingCostSubLabel')}
                </span>
              </span>
            }
            value={
              // No width wrapper any more: the row's value column is 230px and each cell
              // carries `px-[12px]`, so its content box is 206px, and NumberInput's own
              // `fullWidth` already puts `w-full` on the input. The old `w-40` would now
              // be a second source of truth for the same number.
              <RHFInputCell
                fieldName={'appraisalPriceRounded'}
                inputType="number"
                number={{
                  decimalPlaces: 2,
                  maxIntegerDigits: 15,
                  maxValue: 999_999_999_999_999.0,
                  allowNegative: false,
                }}
                // Green — mock:596's `.kv .final .in` (accent text, tinted border and
                // fill), the palette WQS and machinery give their Indicated Value inputs.
                // Every utility here collides with one NumberInput sets itself (this tab
                // is inside a DenseProvider, so the dense branch's `bg-[#f6f9f9]`,
                // `border-transparent`, `h-[21px]`, `text-[12px]` are what's being
                // overridden), and `className` being last in NumberInput's clsx() decides
                // nothing — for same-specificity utilities the compiled stylesheet order
                // wins, not the source order. Hence the important flags.
                //
                // Written as a TRAILING `!`, which is Tailwind v4 syntax (the repo is on
                // tailwindcss ^4.1.7). The siblings' copies of this exact palette use the
                // v3 LEADING form (`!bg-[…]`, WQSAdjustFinalValueSection.tsx:706,
                // CostMachinePanel.tsx:419); v4 does not recognise that form, so those may
                // be emitting nothing at all. Not changed here — that is their files' call
                // and needs a browser to confirm — but see the handoff note.
                inputClassName="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold! text-[12.5px]! h-[26px]! py-0! px-[5px]! rounded-[4px]! w-full!"
              />
            }
            unit={t('costBuilding.summary.baht')}
            // `hint` is the slot the other four methods put their แก้เอง badge in: its own
            // grid row under the value, right-aligned, rather than sitting after the unit
            // cell and pushing the unit off the x every other row shares.
            //
            // Compared against `totalBuildingValue` — the same figure the row above shows
            // and the same one the input is seeded from (:181, :228). That identity is what
            // keeps this silent on an untouched group; point it at anything else and the
            // badge starts reporting the seed instead of the appraiser.
            hint={editedBadge('appraisalPriceRounded', totalBuildingValue)}
          />
        </div>
      </div>
    </div>
  );
}
