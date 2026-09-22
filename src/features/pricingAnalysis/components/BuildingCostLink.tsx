/**
 * BuildingCostLink — the "ค่าอาคาร จาก Building Cost" row's value source and its shortcut.
 *
 * WQS, SAG and DC each show a read-only building-cost row on their summary card. Both halves
 * of that row live here so the three stay in step: they are twins that fixes have repeatedly
 * reached only some of (see the WQS/SAG/DC triplet note), and this row has two moving parts.
 *
 * ── Which number the row shows ────────────────────────────────────────────────
 * The Building Cost method has two totals, and they are not the same thing:
 *
 *   per-building roll-up = Σ (FinalCostValueOverride ?? roundToThousand(afterDepreciation))
 *   method value         = what the appraiser keyed into "มูลค่าตามวิธี" on the BC screen
 *                          and saved (PricingAnalysisMethod.MethodValue)
 *
 * The roll-up is only the BC screen's starting suggestion — the appraiser may overwrite it,
 * and that keyed figure is what the backend stores as the group's building value. The market
 * methods used to show the roll-up, so an appraiser who adjusted the figure on the BC screen
 * saw their own number ignored here with no hint why.
 *
 * So: the saved method value wins, and the roll-up remains the fallback for a group that has
 * a BC method with nothing saved yet. Deliberately the SAVED value, not a live one — the BC
 * screen's unsaved edits are not visible from here, which is the same rule every other
 * cross-method figure on this screen follows.
 *
 * ── The shortcut ─────────────────────────────────────────────────────────────
 * Opening the BC method is a URL write (`?method=COSTAPPR.BC`) that PricingAnalysisPage
 * already knows how to act on, so this reaches it without a callback threaded down through
 * the panel and the form. Leaving the current method is destructive to unsaved work, hence
 * the confirm step — the same shape as the panel's own reset dialog.
 *
 * Both halves return "nothing" when there is no BC method to point at: the row falls back to
 * the roll-up and the link is not rendered. That covers the reference route too, where these
 * panels render outside StateCtx entirely and `useContext` gives null.
 *
 * Note on reading `summarySelected` despite its name: it is filtered by `isIncluded`, not by
 * `isSelected` (see getVisibleApproach in selectionReducer). That distinction is what makes this
 * work at all — a BuildingCost method linked to a WQS/SAG/DC method is deliberately left
 * UNSELECTED so the Cost rollup doesn't count it twice, and a name-led guess that this list held
 * only selected methods would have concluded, wrongly, that it isn't reachable from here.
 */
import { useContext, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { StateCtx } from '../store/selectionContext';
import { COST_APPROACH_TYPE } from '../types/selection';

/** Config key for the Building Cost method — see createInitialState's SERVER_TO_CONFIG_METHOD. */
const BUILDING_COST_METHOD_TYPE = 'BC';

/**
 * The group's Building Cost method as this screen should read it.
 *
 * `methodValue` is null when there is no BC method, or when it has one that has never been
 * saved — both mean "no figure of record yet", and callers fall back to their own roll-up.
 * `exists` is what gates the link: a method must be there to navigate to.
 */
export function useGroupBuildingCostMethod(): { methodValue: number | null; exists: boolean } {
  const state = useContext(StateCtx);

  const method = (state?.summarySelected ?? [])
    .find(approach => approach.approachType === COST_APPROACH_TYPE)
    ?.methods.find(m => m.methodType === BUILDING_COST_METHOD_TYPE);

  if (!method) return { methodValue: null, exists: false };

  // 0 is "not saved yet", not a priced building worth nothing: CostBuildingPanel applies the
  // same reading when it decides whether to restore or re-seed its form.
  const value = method.appraisalValue;
  return { methodValue: value > 0 ? value : null, exists: true };
}

/**
 * The row's hint: a link to the Building Cost method, or nothing when the group has none.
 *
 * `labelKey` differs between the twins only because their locale blocks do — WQS keeps its
 * copy under `wqs.summary`, SAG and DC under `finalValue`.
 */
export function BuildingCostLink({
  labelKey,
  confirmMessageKey,
}: {
  labelKey: 'wqs.summary.editAtBuildingCost' | 'finalValue.editAtBuildingCost';
  confirmMessageKey: 'wqs.summary.leaveUnsaved' | 'finalValue.leaveUnsaved';
}) {
  const { t } = useTranslation('pricingAnalysis');
  const [searchParams, setSearchParams] = useSearchParams();
  const { exists } = useGroupBuildingCostMethod();
  // These sections always render inside their method's FormProvider, so the panel's dirty
  // state is readable here without threading it down.
  const {
    formState: { isDirty },
  } = useFormContext();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  if (!exists) return null;

  const open = () => {
    const next = new URLSearchParams(searchParams);
    next.set('method', `${COST_APPROACH_TYPE}.${BUILDING_COST_METHOD_TYPE}`);
    // Push, so Back returns to the method the user came from — matching how the board opens
    // a method in the first place.
    setSearchParams(next);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (isDirty ? setIsConfirmOpen(true) : open())}
        className="text-[10.5px] text-primary hover:underline cursor-pointer"
      >
        {t(labelKey)}
      </button>
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          open();
        }}
        message={t(confirmMessageKey)}
        confirmText={t('confirm.confirmText')}
        variant="warning"
      />
    </>
  );
}
