import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { MethodFooterActions } from './MethodFooterActions';
import {
  CostMachineFormSchema,
  isMachineRowLocked,
  type CostMachineFormType,
} from '../schemas/costMachineForm';
import { type MachineryItem } from './CostMachineSection';
import toast from 'react-hot-toast';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/shared/components';
import { initializeCostMachineForm } from '../adapters/initializeCostMachineForm';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import CostMachineForm from './CostMachineForm';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMachineCostItems, useResetMethod, useSaveMachineCostItems } from '../api';
import type { SaveMachineCostItemInput } from '../api';
import { pricingAnalysisKeys } from '../api/queryKeys';
import DataErrorState from '@/shared/components/DataErrorState';
import type { MarketComparableDetailType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';

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
  savedMethodValue,
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
    handleSubmit,
    formState: { isDirty },
    getValues,
    reset,
  } = methods;

  // Initialize form once when machine list and saved data are ready
  const isInitialized = useRef(false);
  useEffect(() => {
    if (savedData !== undefined && !isInitialized.current) {
      isInitialized.current = true;
      initializeCostMachineForm({
        machineryItems,
        savedItems: savedData?.items,
        remark: savedData?.remark ?? '',
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
      });

      if (activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue: result.totalFmv,
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
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        // grow/shrink with an auto basis and NO min-h-0, deliberately not `flex-1`.
        // This form shares a flex column with the pricing accordion, which is a plain div with no
        // shrink-0 and a body that expands to its content. Two things have to hold at once:
        //   grow  — take the leftover space when there is any, which is what puts the ActionBar on
        //           the bottom edge instead of trailing the last row of a short table;
        //   no min-h-0 — the accordion keeps its automatic min-height, so once the column runs out
        //           of room the accordion freezes at min-content and every remaining pixel of
        //           shrink lands on this form. `min-h-0` here would let that take the form to ZERO.
        // `basis-auto` alone does NOT protect against that — flex-basis is where shrinking starts,
        // not a floor. Only a min-height is a floor, and dropping min-h-0 from the form is not
        // enough on its own either: the form's min-content counts its children, and the scrolling
        // content region below contributes 0 to it. That is why the real floor is the min-h on
        // that region — see the comment there.
        className="flex flex-col grow shrink basis-auto gap-4"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
            <Icon name="gear" className="size-4" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">{t('costMachine.title')}</h2>
        </div>

        {/* Content — takes whatever height is left and scrolls inside itself, so the footer below
            is always on the bottom edge instead of trailing the last row of a short table.
            The min-height is what stops this from being squeezed to nothing. With `min-h-0` the
            region contributes 0 to the form's own min-content, so the form floors at roughly the
            header plus the Save bar and the table renders at 0px inside a scroll box that has no
            track to scroll — reachable by expanding the pricing accordion on a short screen.
            With a floor here the form can no longer fit, the column overflows, and the page
            scroller on the tab content takes over: the table stays reachable.
            240px is a floor, not a target — it is only reached when the column is shorter than
            about 370px, which in practice means expanding the pricing accordion on a short
            screen, and collapsing it again undoes it. In that state there are two scrollbars,
            this one and the page's. That is the price of keeping the table inside its own box;
            the alternative (no overflow here) lets a tall table run underneath the Save bar.
            Save itself is reachable either way — ActionBar is `sticky bottom-0` and nothing
            between here and the tab scroller clips it. Raise this one number if the squeezed
            window turns out to be too small in practice. */}
        <div className="flex-1 min-h-[240px] overflow-y-auto">
          {isCostItemsError ? (
            <DataErrorState
              title={t('costMachine.loadFailed')}
              onRetry={refetchCostItems}
              variant="inline"
            />
          ) : (
            <CostMachineForm
              machineryItems={machineryItems}
              isLoading={isLoadingCostItems}
              methodId={methodId}
              marketSurveys={marketSurveys}
              templateList={templateList}
            />
          )}
        </div>

        {/* Footer save/cancel */}
        <MethodFooterActions
          showReset={true}
          isSubmitting={saveMutation.isPending}
          onReset={handleOnReset}
          onCancel={onCancelCalculationMethod}
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
