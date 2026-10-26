import { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useAuthStore } from '@/features/auth/store';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { FormProvider } from '@/shared/components/form';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import { errorText } from '@/shared/utils/errorUtils';

import {
  useGetProjectPricingAssumptions,
  useSaveProjectPricingAssumptions,
} from '../../api/projectPricingAssumption';
import {
  projectUnitPriceKeys,
  useGetProjectUnitPrices,
  useGetUnitPriceSource,
  useCalculateProjectUnitPrices,
  useSaveProjectUnitPrices,
} from '../../api/projectUnitPrice';
import { isCondo, isLandAndBuildingLike } from '../../types';
import type {
  ProjectModelAssumption,
  ProjectUnitPrice,
  ProjectUnitPriceFlagData,
  ProjectType,
  UnitPriceSource,
  UnitPriceSourceInfo,
} from '../../types';
import {
  projectPricingAssumptionForm,
  condoPricingAssumptionFormDefaults,
  lbPricingAssumptionFormDefaults,
  type CondoPricingAssumptionFormType,
  type LbPricingAssumptionFormType,
} from '../../schemas/form';
import PricingAssumptionForm from '../../forms/PricingAssumptionForm';
import { useFireInsuranceOptions, useGetFireInsuranceRates } from '@/shared/api/pricingParameters';
import DataErrorState from '@/shared/components/DataErrorState';
import {
  buildDisplayedUnitPrices,
  differsFromStored,
  type AssumptionInputs,
  type ModelPricing,
} from '../../utils/recomputeUnitPrice';
import UnitPriceImportDialog from '../UnitPriceImportDialog';
import { CondoPriceResults, type FlagKey } from '../condo/unitsPrice/CondoPriceResults';
import { CondoPriceLayout, type AssumptionStripInfo } from '../condo/unitsPrice/CondoPriceLayout';
import { RecalcSummaryNote } from '../condo/unitsPrice/RecalcSummaryNote';
import { summarizeRecalc, type RecalcSummary } from '../../utils/recalcSummary';
import { dataRow, dataTable } from '../condo/unitsPrice/lookClasses';
import {
  CondoImportControls,
  CondoImportNotice,
  CondoSourceSwitch,
} from '../condo/unitsPrice/CondoHeadControls';

// ── Model Assumptions Table ───────────────────────────────────────────────────

interface ModelAssumptionsTableProps {
  assumptions: ProjectModelAssumption[];
  projectType: ProjectType;
}

/** Read-only model assumptions, as the data table of DESIGN.md section 10. */
function ModelAssumptionsTable({ assumptions, projectType }: ModelAssumptionsTableProps) {
  const { t } = useTranslation('blockProject');
  const condoFireInsuranceOptions = useFireInsuranceOptions('Condo');
  const lbFireInsuranceOptions = useFireInsuranceOptions('LandAndBuilding');
  const fireInsuranceLabelByCondition = useMemo(() => {
    const options = isCondo(projectType) ? condoFireInsuranceOptions : lbFireInsuranceOptions;
    return new Map(options.map(o => [o.value, o.label]));
  }, [projectType, condoFireInsuranceOptions, lbFireInsuranceOptions]);

  if (assumptions.length === 0) {
    return (
      <p className="text-xs text-(--palette-gray-400) text-center py-6">
        {t('unitPrice.noModelAssumptions')}
      </p>
    );
  }

  const th = clsx(dataTable.th, 'sticky top-0 z-10');
  return (
    <div className="overflow-x-auto">
      <table className={dataTable.table}>
        <thead>
          <tr>
            {isCondo(projectType) && (
              <th className={clsx(th, 'text-left min-w-[100px]')}>
                {t('unitPrice.cols.towerName')}
              </th>
            )}
            <th className={clsx(th, 'text-left min-w-[160px]')}>{t('unitPrice.cols.model')}</th>
            <th className={clsx(th, 'w-full min-w-[200px] text-left')}>
              {t('unitPrice.cols.description')}
            </th>
            <th className={clsx(th, 'text-right')}>{t('unitPrice.cols.usableAreaSqm2')}</th>
            {isLandAndBuildingLike(projectType) && (
              <th className={clsx(th, 'text-right')}>{t('unitPrice.cols.standardLandSqWa')}</th>
            )}
            <th className={clsx(th, 'text-right')}>
              {t(
                // LB's standard price is the price of the whole house, not a rate per sq.m.
                isCondo(projectType)
                  ? 'unitPrice.cols.standardPriceBahtSqm'
                  : 'lbPrice.cols.standardPrice',
              )}
            </th>
            <th className={clsx(th, 'text-right')}>{t('unitPrice.cols.coverageAmountBahtSqm')}</th>
            <th className={clsx(th, 'text-left')}>{t('unitPrice.cols.fireInsuranceCode')}</th>
          </tr>
        </thead>
        <tbody>
          {assumptions.map(m => (
            <tr key={m.projectModelId} className={dataRow.normal}>
              {isCondo(projectType) && <td className={dataTable.td}>{m.towerName ?? '-'}</td>}
              <td className={clsx(dataTable.td, 'font-medium')}>{m.modelType ?? '-'}</td>
              <td className={dataTable.td}>{m.modelDescription ?? '-'}</td>
              <td className={clsx(dataTable.td, 'text-right')}>
                {m.usableAreaFrom == null && m.usableAreaTo == null
                  ? '-'
                  : m.usableAreaFrom != null &&
                      m.usableAreaTo != null &&
                      m.usableAreaFrom !== m.usableAreaTo
                    ? `${m.usableAreaFrom.toLocaleString()} - ${m.usableAreaTo.toLocaleString()}`
                    : ((m.usableAreaFrom ?? m.usableAreaTo)?.toLocaleString() ?? '-')}
              </td>
              {isLandAndBuildingLike(projectType) && (
                <td className={clsx(dataTable.td, 'text-right')}>
                  {m.standardLandPrice?.toLocaleString() ?? '-'}
                </td>
              )}
              <td className={clsx(dataTable.td, 'text-right')}>
                {m.finalAppraisedValue?.toLocaleString() ?? '-'}
              </td>
              <td className={clsx(dataTable.td, 'text-right')}>
                {m.coverageAmount?.toLocaleString() ?? '-'}
              </td>
              <td className={dataTable.td}>
                {m.fireInsuranceCode
                  ? (fireInsuranceLabelByCondition.get(m.fireInsuranceCode) ?? m.fireInsuranceCode)
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface UnitPriceTabProps {
  projectType: ProjectType;
}

export default function UnitPriceTab({ projectType }: UnitPriceTabProps) {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId();
  const queryClient = useQueryClient();
  const isReadOnly = usePageReadOnly();
  const condo = isCondo(projectType);
  // L (appraised as land only) has no models: a unit is priced from its land alone, so nothing waits on a
  // model's standard price and there is no model table or fire cover.
  const land = projectType === 'L';

  const schema = projectPricingAssumptionForm(projectType);
  const defaults = condo ? condoPricingAssumptionFormDefaults : lbPricingAssumptionFormDefaults;

  const {
    data: pricingAssumption,
    isLoading: assumptionLoading,
    isError: assumptionError,
    isFetching: assumptionFetching,
    refetch: refetchAssumption,
  } = useGetProjectPricingAssumptions(appraisalId ?? '');

  const {
    data: unitPricesData,
    isLoading: pricesLoading,
    isError: pricesError,
    isFetching: pricesFetching,
    refetch: refetchPrices,
  } = useGetProjectUnitPrices(appraisalId ?? '', { alwaysRefetch: true });
  const {
    data: sourceInfo,
    isLoading: sourceLoading,
    isFetching: sourceFetching,
    dataUpdatedAt: sourceUpdatedAt,
    refetch: refetchSource,
  } = useGetUnitPriceSource(appraisalId ?? '', { alwaysRefetch: true });
  const {
    data: fireRates,
    isLoading: ratesLoading,
    isError: ratesError,
    refetch: refetchRates,
  } = useGetFireInsuranceRates({ alwaysRefetch: true });

  // The server's price source is the truth; the toggle only overrides it locally. After an import
  // or a Save (calculate) succeeds the override is set to the new source, so the tab doesn't flash
  // the stale server mode while the source query refetches. Never reset by an effect.
  const [modeOverride, setModeOverride] = useState<UnitPriceSource | null>(null);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // The source the user asked for, waiting on an in-page confirm (stored prices exist).
  const [confirmSource, setConfirmSource] = useState<UnitPriceSource | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  // The source as known after this tab's own last write. A successful import / calculate has
  // changed it on the server, but the cached value stays until the refetch lands: this is
  // authoritative in between. Dropped only by a source read that completed after the write began
  // (dataUpdatedAt) and says the same: a failed refetch leaves the cached record, which may be older.
  const [writtenSource, setWrittenSource] = useState<UnitPriceSource | null>(null);
  const [writtenAt, setWrittenAt] = useState(0);
  // Likewise the details of the file just imported, so the card doesn't show the previous file (or
  // none) until the refetch brings the server's own record.
  const [justImported, setJustImported] = useState<Pick<
    UnitPriceSourceInfo,
    'fileName' | 'importedAt' | 'importedBy'
  > | null>(null);
  const currentUsername = useAuthStore(s => s.user?.username ?? null);
  useEffect(() => {
    if (
      writtenSource &&
      !sourceFetching &&
      sourceUpdatedAt > writtenAt &&
      sourceInfo?.source === writtenSource &&
      // After an import the record must also be the new file's: a read that began before the import
      // and landed after it can carry the same source with the previous file.
      (!justImported || sourceInfo.fileName === justImported.fileName)
    ) {
      setWrittenSource(null);
      setJustImported(null);
    }
  }, [
    writtenSource,
    writtenAt,
    justImported,
    sourceFetching,
    sourceUpdatedAt,
    sourceInfo?.source,
    sourceInfo?.fileName,
  ]);
  const serverSource = writtenSource ?? sourceInfo?.source;
  // Built on the effective source (written, else server): a stale cached 'Imported' record must not
  // read as current after a calculate; the file details only follow a just-finished import.
  const cardSource: UnitPriceSourceInfo | undefined = sourceInfo && {
    ...sourceInfo,
    source: serverSource ?? sourceInfo.source,
    ...(writtenSource === 'Imported' && justImported ? justImported : {}),
  };
  const mode: UnitPriceSource = modeOverride ?? serverSource ?? 'Calculated';
  const imported = mode === 'Imported';
  // The Imported view can be open while the server still holds calculated prices (local toggle);
  // only then-stored prices from a real import get the "imported file" labels and metadata.
  const showingImported = imported && serverSource === 'Imported';

  // Local mirror of unit prices: lets the user toggle flags and see an immediate
  // client-side recompute (preview). The backend remains the source of truth on
  // Save / Save Draft — the query is invalidated after save and this state is
  // refilled from the fresh server data via the useEffect below.
  const [localUnitPrices, setLocalUnitPrices] = useState<ProjectUnitPrice[]>([]);
  const [flagsDirty, setFlagsDirty] = useState(false);
  const [saveIntent, setSaveIntent] = useState<'draft' | 'full' | null>(null);
  // What the last "Save and recalculate" changed, until the user dismisses it.
  const [recalcSummary, setRecalcSummary] = useState<RecalcSummary | null>(null);
  // Bumped when the form refuses a save: the (maybe collapsed) panel must show what is wrong.
  const [revealPanel, setRevealPanel] = useState(0);
  const onInvalid = () => setRevealPanel(n => n + 1);
  useEffect(() => {
    setLocalUnitPrices(unitPricesData ?? []);
    setFlagsDirty(false);
  }, [unitPricesData]);

  const { mutateAsync: saveAssumptionAsync, isPending: isSaving } =
    useSaveProjectPricingAssumptions();
  const { mutateAsync: calculatePricesAsync, isPending: isCalculating } =
    useCalculateProjectUnitPrices();
  const { mutateAsync: saveUnitFlagsAsync, isPending: isSavingFlags } = useSaveProjectUnitPrices();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty },
  } = methods;

  const resetFormToServer = useCallback(() => {
    // Nothing saved yet (the normal first state of an L project, which has no models to derive an
    // assumption from): back to the type's blank form.
    if (!pricingAssumption) {
      reset(defaults);
    } else {
      if (isCondo(projectType)) {
        reset({
          locationMethod: pricingAssumption.locationMethod ?? 'AdjustPriceSqm',
          cornerAdjustment: pricingAssumption.cornerAdjustment ?? null,
          edgeAdjustment: pricingAssumption.edgeAdjustment ?? null,
          otherAdjustment: pricingAssumption.otherAdjustment ?? null,
          poolViewAdjustment: pricingAssumption.poolViewAdjustment ?? null,
          southAdjustment: pricingAssumption.southAdjustment ?? null,
          floorIncrementEveryXFloor: pricingAssumption.floorIncrementEveryXFloor ?? null,
          floorIncrementAmount: pricingAssumption.floorIncrementAmount ?? null,
          forceSalePercentage: pricingAssumption.forceSalePercentage ?? null,
        } satisfies CondoPricingAssumptionFormType);
      } else {
        reset({
          locationMethod: pricingAssumption.locationMethod ?? 'AdjustPriceSqm',
          cornerAdjustment: pricingAssumption.cornerAdjustment ?? null,
          edgeAdjustment: pricingAssumption.edgeAdjustment ?? null,
          otherAdjustment: pricingAssumption.otherAdjustment ?? null,
          nearGardenAdjustment: pricingAssumption.nearGardenAdjustment ?? null,
          landIncreaseDecreaseRate: pricingAssumption.landIncreaseDecreaseRate ?? null,
          forceSalePercentage: pricingAssumption.forceSalePercentage ?? null,
        } satisfies LbPricingAssumptionFormType);
      }
    }
  }, [pricingAssumption, reset, projectType, defaults]);
  useEffect(() => {
    if (pricingAssumption) resetFormToServer();
  }, [pricingAssumption, resetFormToServer]);

  // Live form values for the client-side preview recompute (uses unsaved edits).
  // Cast: react-hook-form's generic is `any` here since the schema differs per project type.
  const watchedAssumption = useWatch({ control: methods.control }) as AssumptionInputs;

  // Persist: save flags + assumption together. When `withCalculate` is true
  // the backend recomputes and becomes the source of truth; the unit-prices
  // query is invalidated by the mutation hooks, refilling local state.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persistAssumption = async (data: any, withCalculate: boolean) => {
    if (!appraisalId) return;
    setSaveIntent(withCalculate ? 'full' : 'draft');
    setRecalcSummary(null);
    const startedAt = Date.now();
    // The prices as stored now, to say afterwards what the recalculation changed.
    const storedBefore = unitPricesData ?? [];
    const flags: ProjectUnitPriceFlagData[] = localUnitPrices.map(up => ({
      projectUnitId: up.projectUnitId,
      isCorner: up.isCorner,
      isEdge: up.isEdge,
      isPoolView: up.isPoolView,
      isSouth: up.isSouth,
      isOther: up.isOther,
      isNearGarden: up.isNearGarden,
    }));

    try {
      if (flags.length > 0) {
        await saveUnitFlagsAsync({ appraisalId, flags });
      }
      await saveAssumptionAsync({ appraisalId, data });
      reset(data);
      // The flags are stored now. Not left to the [unitPricesData] effect: when the refetch returns
      // identical data React Query keeps the same reference and that effect never runs.
      setFlagsDirty(false);

      if (withCalculate) {
        // After the flag and assumption saves, whose own refetches stamp the prices too.
        const calculateStartedAt = Date.now();
        await calculatePricesAsync({ appraisalId });
        setModeOverride('Calculated'); // the new server source, ahead of the refetch
        setWrittenSource('Calculated');
        setWrittenAt(startedAt);
        refetchRates(); // calculate priced with the current rates; the preview should too
        // calculate's onSettled has refetched the prices by now: the cache holds the new stored
        // rows. A failed refetch leaves the old rows (status 'error', or an update older than this
        // calculate): no summary then, and the toast says it worked.
        const fresh = queryClient.getQueryState<ProjectUnitPrice[]>(
          projectUnitPriceKeys.all(appraisalId),
        );
        const summary =
          fresh?.status === 'success' && fresh.data && fresh.dataUpdatedAt >= calculateStartedAt
            ? summarizeRecalc(storedBefore, fresh.data)
            : null;
        if (summary) setRecalcSummary(summary);
        else toast.success(t('toasts.pricing.saveSuccess'));
      } else {
        toast.success(t('toasts.pricing.saveDraftSuccess'));
      }
    } catch (err) {
      toast.error(errorText(err, t('toasts.pricing.saveFailed')));
    } finally {
      setSaveIntent(null);
    }
  };

  // Toggle a flag client-side only — just flips the flag on the local row.
  // The displayed totals are derived below via `displayedUnitPrices`, so any
  // change to the assumption form OR a flag toggle re-runs the preview.
  // No API call here — the server recomputes on Save / Save Draft.
  const handleToggleFlag = (unitId: string, flag: FlagKey, value: boolean) => {
    setLocalUnitPrices(prev =>
      prev.map(up => (up.projectUnitId === unitId ? { ...up, [flag]: value } : up)),
    );
    setFlagsDirty(true);
  };

  const modelAssumptions = useMemo(
    () => pricingAssumption?.modelAssumptions ?? [],
    [pricingAssumption],
  );

  // Current fire-insurance rate (Baht/sq.m.) per rate code. No property-kind filter: the backend's
  // calculate looks rates up by code alone.
  const fireRateByCode = useMemo(
    () => new Map((fireRates ?? []).map(r => [r.code, r.ratePerSqm])),
    [fireRates],
  );

  // The coverage rate for a model, as the backend resolves it: the current rate for its
  // fire-insurance code, else the one saved on the model assumption. The preview and the table of
  // assumptions both use it.
  const coverageRateOf = useCallback(
    (m: ProjectModelAssumption) =>
      (m.fireInsuranceCode ? fireRateByCode.get(m.fireInsuranceCode) : undefined) ??
      m.coverageAmount,
    [fireRateByCode],
  );
  const shownAssumptions = useMemo(() => {
    const rows = modelAssumptions.map(m => ({ ...m, coverageAmount: coverageRateOf(m) }));
    // By tower (condo only), then model, in natural order ("A 2" before "A 10"); no tower last.
    const natural = (a: string, b: string) =>
      a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' });
    const byName = (a?: string, b?: string) => (a && b ? natural(a, b) : a ? -1 : b ? 1 : 0);
    return rows.sort(
      (a, b) => byName(a.towerName, b.towerName) || byName(a.modelType, b.modelType),
    );
  }, [modelAssumptions, coverageRateOf]);

  // Lookup: projectModelId → model assumption fields needed for the live preview.
  // Keyed by id, not modelType — for Condo a model's identity is (Tower, ModelName), so the same
  // model name can legitimately repeat across towers with different standard price/coverage.
  // Keying by name alone would collapse those into one entry and misprice every unit whose model
  // name repeats in another tower.
  const modelLookup = useMemo(
    () =>
      new Map<string, ModelPricing>(
        modelAssumptions.map(m => [
          m.projectModelId,
          {
            standardPrice: m.finalAppraisedValue,
            coverageAmount: coverageRateOf(m),
            // standardLandPrice holds the standard land AREA (Sq.Wa) — see DeriveFromModels
            standardLandArea: m.standardLandPrice,
          },
        ]),
      ),
    [modelAssumptions, coverageRateOf],
  );

  // The form's forced-sale % (unsaved edits included) when it is a number in 0..100, else the
  // system default. Not the saved/effective rate: clearing the field stores null on Save, and the
  // backend then applies the system default (it also treats an out-of-range value that way).
  const previewAssumption = useMemo<AssumptionInputs>(() => {
    const entered = watchedAssumption.forceSalePercentage;
    const valid = typeof entered === 'number' && entered >= 0 && entered <= 100;
    return {
      ...watchedAssumption,
      forceSalePercentage: valid
        ? entered
        : (pricingAssumption?.systemDefaultForceSalePercentage ?? null),
    };
  }, [watchedAssumption, pricingAssumption?.systemDefaultForceSalePercentage]);

  // The live recompute (what Save would write). The Imported view has none: it shows the stored
  // rows exactly as the API returned them.
  const recomputedUnitPrices = useMemo(
    () =>
      imported
        ? localUnitPrices
        : buildDisplayedUnitPrices(localUnitPrices, previewAssumption, projectType, modelLookup),
    [imported, localUnitPrices, previewAssumption, projectType, modelLookup],
  );

  // The Calculated grid is only "calculated" when it equals what is stored. It is a preview while
  // the form or a flag is dirty, or over an imported price list. A recompute that merely differs
  // from the stored rows is a hint, not a preview. Not while the lookup it is priced from is still
  // loading or has failed: an empty lookup would mark every row as changed.
  // A background refetch that fails while earlier data is on screen is not a failed load.
  // "No data" means undefined: a successful null (nothing saved yet) is data.
  const assumptionFailed = assumptionError && pricingAssumption === undefined;
  const ratesFailed = ratesError && fireRates === undefined;
  const pricesFailed = pricesError && unitPricesData === undefined;
  const lookupReady = !assumptionLoading && !assumptionFailed && !ratesLoading && !ratesFailed;
  // Skipped when the answer cannot matter: an edit already makes the grid "unsaved", and the Imported
  // view shows the stored rows themselves.
  const editing = isDirty || flagsDirty;

  // Shows what is stored until the user edits an assumption or a flag (or looks at the Calculated
  // view over an imported list, where the recompute is what Save would write). A recompute that
  // merely differs from what is stored is a hint, not an unsaved change: models without a pricing
  // analysis recompute to 0, which must not read as the project's prices.
  const showRecompute = editing || serverSource === 'Imported';
  const displayedUnitPrices = imported || !showRecompute ? localUnitPrices : recomputedUnitPrices;

  // Units whose model has a standard price: only those can be priced by a recompute.
  const pricedModelIds = useMemo(
    () =>
      new Set(
        modelAssumptions.filter(m => m.finalAppraisedValue != null).map(m => m.projectModelId),
      ),
    [modelAssumptions],
  );
  // Q6 ("—" and left out of the totals) is for the recompute only. The stored view and the
  // Imported view show every stored value as it is: a unit counts as priced when it has one.
  // L has no models: every unit can be priced.
  const modelPriced = useCallback(
    (up: ProjectUnitPrice) =>
      imported || !showRecompute || land || pricedModelIds.has(up.projectModelId ?? ''),
    [imported, showRecompute, land, pricedModelIds],
  );
  // Units holding a stored price although their model has no standard price: a recompute would
  // price them without one. (A stored 0 loses nothing.)
  const noStandardCount = useMemo(
    () =>
      land
        ? 0
        : (unitPricesData ?? []).filter(
            up =>
              !pricedModelIds.has(up.projectModelId ?? '') &&
              (up.totalAppraisalValueRounded ?? 0) !== 0,
          ).length,
    [land, unitPricesData, pricedModelIds],
  );
  // Hint: how many units a recalculation would re-price (no unsaved indicator for this).
  const recalcCount = useMemo(
    () =>
      // A read-only user cannot recalculate: no hint.
      showRecompute || imported || !lookupReady || isReadOnly
        ? 0
        : recomputedUnitPrices.reduce((n, row, i) => {
            const stored = localUnitPrices[i];
            // A model with no standard price recomputes to nothing: a unit it never priced has
            // nothing to change.
            if (
              !land &&
              !pricedModelIds.has(row.projectModelId ?? '') &&
              (stored.totalAppraisalValueRounded ?? 0) === 0
            ) {
              return n;
            }
            return differsFromStored([row], [stored]) ? n + 1 : n;
          }, 0),
    [
      land,
      showRecompute,
      imported,
      lookupReady,
      recomputedUnitPrices,
      localUnitPrices,
      pricedModelIds,
      isReadOnly,
    ],
  );
  const previewDriven = lookupReady && serverSource === 'Imported';
  // Unsaved: edits, or the Calculated view over an imported list. The "Preview" badge is stricter:
  // it also needs the lookup the preview is priced from (an empty one would mislabel).
  const hasUnsaved = !imported && (isDirty || flagsDirty || previewDriven);
  const isPreviewing = hasUnsaved && lookupReady;
  const isBusy = isSaving || isSavingFlags || isCalculating || saveIntent !== null;
  // Save writes the form over the stored assumption, so it waits for that assumption to be known.
  // Nor before the source is fresh: a cached mode may be stale, and Save's meaning depends on it.
  const assumptionBlocked = assumptionLoading || assumptionFailed;
  // While the assumption or the stored prices are being refetched, the effects that copy the server's
  // values into the form and the local rows could overwrite an edit made in the meantime: so nothing
  // is editable (nor savable) until they have landed.
  const refreshing = assumptionFetching || pricesFetching;
  // One lock for everything the user can edit or save, so the parts cannot drift apart: read-only
  // page, a save in progress, or any of the data it is built on being refetched. (The source toggle
  // has its own rule.)
  const locked = isReadOnly || isBusy || refreshing || sourceFetching;

  const handleSwitchMode = (next: UnitPriceSource) => {
    if (isReadOnly || isBusy || next === mode) return;
    // Leaving an imported price list: nothing is written until Save, but warn first.
    if (next === 'Calculated' && serverSource === 'Imported') setConfirmSwitch(true);
    // Unsaved edits are not carried into the Imported view: ask, then drop them.
    else if (next === 'Imported' && (isDirty || flagsDirty)) setConfirmDiscard(true);
    // Any switch away from stored prices is confirmed in the page.
    else if ((cardSource?.pricedUnitCount ?? 0) > 0) setConfirmSource(next);
    else setModeOverride(next);
  };

  // Back to what is stored: the form and the flags return to the server's values.
  const handleResetEdits = () => {
    resetFormToServer();
    setLocalUnitPrices(unitPricesData ?? []);
    setFlagsDirty(false);
  };

  const handleDiscardAndImport = () => {
    handleResetEdits();
    setModeOverride('Imported');
    setConfirmDiscard(false);
  };

  // Until the server says where the prices come from, nothing is offered: guessing Calculated
  // would put Save Draft in front of an imported price list.
  if (sourceLoading) {
    return (
      <div className="space-y-3 p-2" role="status" aria-label={t('unitPrice.source.loading')}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 animate-pulse rounded bg-(--palette-surface-3)" />
        ))}
      </div>
    );
  }
  // Only with no source data at all: a failed background refetch keeps the tab on screen.
  if (sourceInfo === undefined) {
    return <DataErrorState variant="inline" onRetry={() => refetchSource()} />;
  }

  // What the collapsed assumptions strip keeps on show.
  // A saved percentage method (the BE still prices it) keeps its own label; anything else but
  // Lumpsum reads as the per-area method.
  const method = watchedAssumption.locationMethod;
  const methodKey =
    method === 'Lumpsum' || method === 'AdjustPricePercentage' ? method : 'AdjustPriceSqm';
  const stripInfo: AssumptionStripInfo = {
    method: { AdjustPriceSqm: '01', Lumpsum: '02', AdjustPricePercentage: '%' }[methodKey],
    methodTitle:
      methodKey === 'AdjustPricePercentage'
        ? t('options.locationMethod.AdjustPricePercentage')
        : t(`options.${condo ? 'locationMethodBySqWa' : 'locationMethodByM'}.${methodKey}`),
    forceSale: previewAssumption.forceSalePercentage ?? null,
    // method + the locations + the floor / land values + forced sale (the panel's fields)
    count: condo ? 9 : land ? 6 : 7,
    edited: !isReadOnly && editing,
  };
  const recalcHint = t('unitPrice.actions.saveAndRecalculateHint');

  // One results card (the source switch, the folded model assumptions or the import controls all
  // live in its head) next to the assumption panel.
  const body = (
    <CondoPriceLayout
      // Only once the saved assumption is known, so the blank defaults can never be saved over it.
      panel={
        !imported && !assumptionBlocked ? (
          <FormReadOnlyContext.Provider value={locked}>
            <PricingAssumptionForm projectType={projectType} plain={isReadOnly} />
          </FormReadOnlyContext.Provider>
        ) : undefined
      }
      stripInfo={stripInfo}
      revealPanel={revealPanel}
      results={
        <CondoPriceResults
          projectType={projectType}
          recalcSummary={
            recalcSummary && !imported && !isReadOnly ? (
              <RecalcSummaryNote summary={recalcSummary} onDismiss={() => setRecalcSummary(null)} />
            ) : undefined
          }
          sourceSwitch={
            <CondoSourceSwitch
              current={mode}
              readOnly={isReadOnly}
              busy={isBusy}
              onSwitch={handleSwitchMode}
            />
          }
          importControls={
            imported ? (
              <CondoImportControls
                appraisalId={appraisalId ?? ''}
                source={cardSource}
                isReadOnly={isReadOnly}
                onUpload={() => setUploadOpen(true)}
              />
            ) : undefined
          }
          notice={
            imported ? (
              <CondoImportNotice source={cardSource} unitPrices={unitPricesData} />
            ) : undefined
          }
          assumptions={
            imported || land
              ? undefined
              : {
                  modelCount: modelAssumptions.length,
                  pricedCount: pricedModelIds.size,
                  table: assumptionLoading ? (
                    <div className="space-y-2 p-4">
                      {[1, 2].map(i => (
                        <div
                          key={i}
                          className="h-8 animate-pulse rounded bg-(--palette-surface-3)"
                        />
                      ))}
                    </div>
                  ) : assumptionFailed ? (
                    // Retry lives on the unit price table, which waits on the same query.
                    <DataErrorState variant="inline" />
                  ) : (
                    <ModelAssumptionsTable
                      assumptions={shownAssumptions}
                      projectType={projectType}
                    />
                  ),
                }
          }
          rows={displayedUnitPrices}
          baseline={isPreviewing && editing ? (unitPricesData ?? []) : undefined}
          modelPriced={modelPriced}
          imported={imported}
          showingImported={showingImported}
          preview={isPreviewing ? (editing ? 'edit' : 'switch') : null}
          recalcCount={recalcCount}
          noStandardCount={noStandardCount}
          amounts={watchedAssumption}
          flagsEditable={!isReadOnly}
          locked={locked}
          onToggleFlag={handleToggleFlag}
          onReset={editing ? handleResetEdits : undefined}
          // The recompute prices every row from the model lookup and the fire-insurance rates:
          // until both have loaded (or if one failed) rows would come out priced at 0, so wait.
          isLoading={pricesLoading || (!imported && (assumptionLoading || ratesLoading))}
          error={
            pricesFailed ? (
              // A failed load must not read as "no units uploaded".
              <DataErrorState variant="inline" onRetry={() => refetchPrices()} />
            ) : !imported && (assumptionFailed || ratesFailed) ? (
              <DataErrorState
                variant="inline"
                onRetry={() => {
                  if (assumptionFailed) refetchAssumption();
                  if (ratesFailed) refetchRates();
                }}
              />
            ) : undefined
          }
        />
      }
    />
  );

  return (
    <FormProvider methods={methods} schema={schema}>
      <form
        onSubmit={handleSubmit(data => persistAssumption(data, true), onInvalid)}
        className="flex flex-col h-full min-h-0"
      >
        {/* The scroller is a size container, so the results card and the sticky assumption panel
            can end exactly where the scroll area (and so the action bar below it) begins: 100cqh. */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-4 [container-type:size]">{body}</div>

        {/* Sticky bottom action bar */}
        <ActionBar>
          <ActionBar.Left>
            <CancelButton />
            {!isReadOnly && !imported && (
              <>
                <ActionBar.Divider />
                <ActionBar.UnsavedIndicator show={hasUnsaved} />
              </>
            )}
          </ActionBar.Left>
          {!isReadOnly && !imported && (
            // Its own flex item (not inside `ActionBar.Right`, which cannot shrink): the buttons keep
            // their labels whole and this is what gets one line cut with an ellipsis (`truncate`
            // keeps Thai marks, DESIGN.md section 4).
            <span
              id="recalc-consequence"
              title={recalcHint}
              className="min-w-0 flex-1 truncate px-3 py-0.5 text-right text-xs text-(--palette-ink-2)"
            >
              {recalcHint}
            </span>
          )}
          {!isReadOnly && !imported && (
            <ActionBar.Right>
              {/* Over an imported price list only Save is offered: it recalculates and flips the
                  source, whereas a draft would leave the imported prices next to new assumptions. */}
              {serverSource !== 'Imported' && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => handleSubmit(data => persistAssumption(data, false), onInvalid)()}
                  isLoading={saveIntent === 'draft' && isBusy}
                  disabled={locked || assumptionBlocked}
                  className="shrink-0 whitespace-nowrap"
                >
                  {t('actions.saveDraft')}
                </Button>
              )}
              <Button
                type="submit"
                title={recalcHint}
                aria-describedby="recalc-consequence"
                className="shrink-0 whitespace-nowrap"
                isLoading={saveIntent === 'full' && isBusy}
                disabled={locked || assumptionBlocked}
              >
                <Icon name="calculator" style="solid" className="size-4 mr-2" />
                {t('unitPrice.actions.saveAndRecalculate')}
              </Button>
            </ActionBar.Right>
          )}
        </ActionBar>
      </form>

      <ConfirmDialog
        isOpen={confirmSwitch}
        onClose={() => setConfirmSwitch(false)}
        onConfirm={() => {
          setModeOverride('Calculated');
          setConfirmSwitch(false);
        }}
        title={t('unitPrice.switchToCalculated.title')}
        message={t('unitPrice.switchToCalculated.message')}
        confirmText={t('unitPrice.switchToCalculated.confirm')}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={confirmSource !== null}
        onClose={() => setConfirmSource(null)}
        onConfirm={() => {
          if (confirmSource) setModeOverride(confirmSource);
          setConfirmSource(null);
        }}
        title={t(
          confirmSource === 'Imported'
            ? 'condoUnitsPrice.switch.toImportedTitle'
            : 'condoUnitsPrice.switch.toCalculatedTitle',
        )}
        message={
          confirmSource === 'Imported'
            ? t('condoUnitsPrice.switch.toImportedMessage', {
                count: cardSource?.pricedUnitCount ?? 0,
                n: (cardSource?.pricedUnitCount ?? 0).toLocaleString(),
              })
            : t('condoUnitsPrice.switch.toCalculatedMessage')
        }
        confirmText={t('unitPrice.switchToCalculated.confirm')}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={handleDiscardAndImport}
        title={t('unitPrice.discardChanges.title')}
        message={t('unitPrice.discardChanges.message')}
        confirmText={t('unitPrice.discardChanges.confirm')}
        variant="warning"
      />

      {uploadOpen && appraisalId && (
        <UnitPriceImportDialog
          appraisalId={appraisalId}
          onClose={() => setUploadOpen(false)}
          onImported={(result, startedAt) => {
            setModeOverride('Imported');
            setWrittenSource('Imported');
            setWrittenAt(startedAt);
            setJustImported({
              fileName: result.fileName,
              importedAt: new Date().toISOString(),
              importedBy: currentUsername,
            });
          }}
        />
      )}
    </FormProvider>
  );
}
