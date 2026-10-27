import { NumberInput } from '@/shared/components/inputs';
import clsx from 'clsx';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useGroupBuildingCostMethod } from '../BuildingCostLink';
import { StateCtx } from '../../store/selectionContext';
import { hasBuildingBreakdown } from '../../utils/manualBreakdown';
import type { ManualCostBreakdownContext, Method } from '../../types/selection';

const LAND_RATE_DEBOUNCE_MS = 1000;

/** Match the rounding the appraiser applies by hand on the calculated Cost path. */
const roundToThousand = (value: number) => Math.round(value / 1000) * 1000;

/**
 * The price a breakdown derives: land (rate × area, rounded to whole baht exactly as the backend
 * stores it) plus the building, rounded to the thousand. Rounding the raw product in one step would
 * round off a number that is never shown, and 55,925,499.63 lands a thousand below the
 * 55,925,500 the card prints. One rule, so the typed rate, the typed building, the pushed
 * breakdown and the displayed total cannot drift.
 */
const breakdownTotal = (rate: number | null, landArea: number, building: number | null) =>
  roundToThousand(Math.round((rate ?? 0) * landArea) + (building ?? 0));

const formatMoney = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ManualCostBreakdownProps {
  approachType: string;
  method: Method;
  context: ManualCostBreakdownContext;
  /** Pushes the derived total into the price input the appraiser can still round by hand. */
  onTotalChange: (total: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Land-rate entry for a method priced by hand.
 *
 * Land role: the appraiser types one number — the land price per square wa — and the land value is
 * derived from it and the title-deed area.
 *
 * Cost `LandAndBuilding` role: a second input holds the building value, and the total is land +
 * building. Storing the two figures separately is what makes the appraisal summary print ที่ดิน
 * and สิ่งปลูกสร้าง as separate rows instead of one combined line.
 */
export const ManualCostBreakdown = ({
  approachType,
  method,
  context,
  onTotalChange,
  disabled = false,
  compact = false,
}: ManualCostBreakdownProps) => {
  const { t } = useTranslation('pricingAnalysis');
  const isReadOnly = usePageReadOnly();
  const [rateInput, setRateInput] = useState<number | null>(method.landRatePerSqWa ?? null);
  const debouncedRate = useDebounce(rateInput, LAND_RATE_DEBOUNCE_MS);

  // Only a Cost LandAndBuilding method prices the building here (showCostBreakdown in
  // PricingAnalysisMethodBoardRow admits nothing else with this role).
  const withBuilding = hasBuildingBreakdown(approachType, method);
  // The method's OWN saved building — null when it has none. This, never a borrowed figure, is what
  // change detection compares against and what read-only mode shows.
  const ownBuilding = withBuilding ? (method.buildingValue ?? null) : null;
  // Seeds the input only (never re-read after mount): the same figure the calculated path shows as
  // the building row — the Building Cost method's saved value, else the group's per-building
  // roll-up (context.buildingValue), see BuildingCostLink. Because it is not the baseline, a live
  // change to the Building Cost method is no edit of this row, and a row that has only the
  // prefill counts as unsaved and is pushed once.
  const { methodValue: buildingCostMethodValue } = useGroupBuildingCostMethod();
  const seedBuilding = ownBuilding ?? buildingCostMethodValue ?? context.buildingValue ?? null;
  const [buildingInput, setBuildingInput] = useState<number | null>(seedBuilding);
  const debouncedBuilding = useDebounce(buildingInput, LAND_RATE_DEBOUNCE_MS);

  const landArea = context.landAreaInSqWa ?? 0;
  const { onLandRateSync, onBreakdownRevert } = context;
  const selection = useContext(StateCtx);
  const methodType = method.methodType;
  const methodId = method.id;
  const savedRate = method.landRatePerSqWa ?? null;
  // A viewer sees the saved figures only, never what the inputs were seeded with.
  const shownRate = isReadOnly ? savedRate : rateInput;
  // A Land-role method's value is the land alone: folding the group's building total into it made
  // it produce land + building while still tagged as covering only Land, so the Cost approach
  // added the building again through whichever method covers it — the double-count the board's
  // formula row warns about. The building is therefore read only when `withBuilding`.
  const shownBuilding = withBuilding ? (isReadOnly ? ownBuilding : buildingInput) : null;
  const landValue = Math.round((shownRate ?? 0) * landArea);
  const total = breakdownTotal(shownRate, landArea, shownBuilding);

  // Set by Escape so the blur it triggers does not save the figure that was just abandoned.
  const escapedRef = useRef(false);
  // How things stood when the current edit began, so Escape can put all of it back. Null between
  // edits. `dispatched` records that this edit has already reached the reducer (the derived price,
  // or a breakdown the debounce pushed); until then Escape only resets the local inputs.
  const editStartRef = useRef<{
    rate: number | null;
    building: number | null;
    price: number;
    savedRate: number | null;
    ownBuilding: number | null;
    breakdownWasDirty: boolean;
    valueWasDirty: boolean;
    dispatched: boolean;
  } | null>(null);
  const beginEdit = () => {
    editStartRef.current ??= {
      rate: rateInput,
      building: buildingInput,
      price: method.appraisalValue,
      savedRate,
      ownBuilding,
      breakdownWasDirty: !!methodId && !!selection?.dirtyCostBreakdownKeys.includes(methodId),
      valueWasDirty: !!methodId && !!selection?.dirtyManualValueKeys.includes(methodId),
      dispatched: false,
    };
    return editStartRef.current;
  };
  const setPrice = (value: number) => {
    if (editStartRef.current) editStartRef.current.dispatched = true;
    onTotalChange(value);
  };

  // Land role leaves buildingValue undefined, so the reducer and the save request ignore it.
  // An emptied building input counts as 0 — the server rejects null for LandAndBuilding. With a
  // rate, the price follows the pushed figures so the stored total is land + building.
  const pushBreakdown = useCallback(
    (rate: number | null, building: number | null) => {
      if (editStartRef.current) editStartRef.current.dispatched = true;
      onLandRateSync({
        approachType,
        methodType,
        rate,
        methodId,
        buildingValue: withBuilding ? (building ?? 0) : undefined,
      });
      if (withBuilding && rate != null) onTotalChange(breakdownTotal(rate, landArea, building));
    },
    [onLandRateSync, onTotalChange, approachType, methodType, methodId, withBuilding, landArea],
  );

  // Same shape as the price input's debounce: push into the reducer once typing settles, and
  // no-op afterwards because the saved figures have caught up with what was typed. A building
  // edit only counts once a rate is set (the breakdown is the rate); clearing the rate clears it.
  useEffect(() => {
    // A viewer or a locked row edits nothing, and the unsaved prefill must not be dispatched on
    // their behalf.
    if (isReadOnly || disabled) return;
    // A debounced figure the input has already moved off (typing resumed, or Escape) is stale.
    if (debouncedRate !== rateInput || debouncedBuilding !== buildingInput) return;
    const rateChanged = debouncedRate !== savedRate;
    const buildingChanged = withBuilding && (debouncedBuilding ?? 0) !== ownBuilding;
    if (!rateChanged && !(buildingChanged && debouncedRate != null)) return;
    pushBreakdown(debouncedRate, debouncedBuilding);
  }, [
    isReadOnly,
    disabled,
    rateInput,
    buildingInput,
    debouncedRate,
    debouncedBuilding,
    savedRate,
    ownBuilding,
    withBuilding,
    pushBreakdown,
  ]);

  const handleChange = (e: { target: { name?: string; value: number | null } }) => {
    const next = e.target.value;
    const start = beginEdit();
    setRateInput(next);
    // Re-derive the price the moment the rate moves. The appraiser can still overwrite it in the
    // price field afterwards — that rounded figure is this method's value, and rounding is
    // their call. Clearing the rate on a LandAndBuilding row puts back the price it had when this
    // edit began (the lump): the keystrokes on the way to empty must not leave a half-typed rate's
    // price behind, and the building alone must never become the price.
    if (next == null && withBuilding) setPrice(start.price);
    else setPrice(breakdownTotal(next, landArea, shownBuilding));
  };

  const handleBuildingChange = (e: { target: { name?: string; value: number | null } }) => {
    const next = e.target.value;
    beginEdit();
    setBuildingInput(next);
    // Without a rate there is no breakdown yet, so the building alone must not become the price.
    if (rateInput != null) setPrice(breakdownTotal(rateInput, landArea, next));
  };

  // Ends the edit: what was typed is now the baseline. After Escape the blur saves nothing.
  const finishEdit = () => {
    editStartRef.current = null;
    if (!escapedRef.current) return false;
    escapedRef.current = false;
    return true;
  };

  const handleBlur = () => {
    if (finishEdit() || rateInput === savedRate) return;
    pushBreakdown(rateInput, buildingInput);
  };

  const handleBuildingBlur = () => {
    if (finishEdit() || rateInput == null || (buildingInput ?? 0) === ownBuilding) return;
    pushBreakdown(rateInput, buildingInput);
  };

  // Escape abandons the whole edit: rate and building inputs go back to what they were when it
  // began (not to the current saved or seed figures, which the debounce may have moved), and the
  // blur that follows saves nothing. Only if the edit had already reached the reducer is the
  // method put back there too, with the dirty marks the edit added dropped; otherwise nothing is
  // dispatched at all.
  const abandonEdit = (e: React.KeyboardEvent) => {
    const start = editStartRef.current;
    escapedRef.current = true;
    if (start) {
      setRateInput(start.rate);
      setBuildingInput(start.building);
      if (start.dispatched) {
        onBreakdownRevert({
          approachType,
          methodType,
          methodId,
          rate: start.savedRate,
          buildingValue: withBuilding ? start.ownBuilding : undefined,
          price: start.price,
          keepBreakdownDirty: start.breakdownWasDirty,
          keepValueDirty: start.valueWasDirty,
        });
      }
    }
    (e.target as HTMLInputElement).blur();
  };

  const handleBuildingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') abandonEdit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') abandonEdit(e);
  };

  const lineClass = clsx(
    'flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums',
    compact ? 'mt-1.5 text-[11px]' : 'mt-2 text-xs',
  );

  // The land line reads left to right as the arithmetic it is: rate × area = land value. It
  // replaced a five-row vertical table whose only editable cell was the first — four of the five
  // rows restated figures the sentence carries inline. A Land method stops there (see landValue
  // above); a Cost LandAndBuilding method adds the building input and the total beneath it.
  return (
    <div>
      <div className={lineClass}>
        <span
          className={clsx('font-medium text-(--palette-ink)', compact ? 'text-[11px]' : 'text-xs')}
        >
          {t('manualCost.landRate')}
        </span>

        {isReadOnly ? (
          <span className="font-semibold text-(--palette-ink)">{formatMoney(savedRate ?? 0)}</span>
        ) : (
          // Same three props as the method row's own value input directly above this one
          // (PricingAnalysisMethodBoardRow) — `dense`, `fullWidth={false}`, `w-32` — so the two
          // boxes are the same object seen twice rather than two boxes that happen to be near
          // each other. `dense` is what carries the mock's `.in` treatment: 21px tall, 4px
          // radius, quiet #f6f9f9 fill, border appearing only on hover/focus.
          //
          // No rightIcon: it would add `pr-12` and push the figure 48px off the right edge, which
          // is the whole visible difference between these two boxes. The unit is already stated
          // in the label to the left ("ราคาที่ดิน / ตร.ว."), so a ฿ here was repeating it at the
          // cost of the alignment.
          <NumberInput
            dense
            value={rateInput}
            disabled={disabled}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            decimalPlaces={2}
            placeholder="0.00"
            fullWidth={false}
            className="w-32"
          />
        )}

        <span className="text-(--palette-gray-500)">
          ×{' '}
          {landArea.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          {t('manualCost.sqWaUnit')}
        </span>

        <span className="text-(--palette-gray-400)">=</span>

        <span className="text-(--palette-gray-500)">
          {/* Reuses the board's own role label, so this word and the role chip on the row above can
            never drift apart. */}
          {t('board.role.Land')}{' '}
          <b className="font-semibold text-(--palette-ink)">
            {/* No forced decimals: the figure is a product, and the image this follows shows a whole
              number as a whole number. A rate with satang still shows its own precision rather
              than being silently rounded into the sentence. */}
            {landValue.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </b>
        </span>
      </div>

      {withBuilding && (
        <>
          <div className={lineClass}>
            <span
              className={clsx(
                'font-medium text-(--palette-ink)',
                compact ? 'text-[11px]' : 'text-xs',
              )}
            >
              {t('manualCost.buildingValue')}
            </span>
            {isReadOnly ? (
              <span className="font-semibold text-(--palette-ink)">
                {ownBuilding == null ? '-' : formatMoney(ownBuilding)}
              </span>
            ) : (
              <NumberInput
                dense
                value={buildingInput}
                disabled={disabled}
                onChange={handleBuildingChange}
                onBlur={handleBuildingBlur}
                onKeyDown={handleBuildingKeyDown}
                decimalPlaces={2}
                placeholder="0.00"
                fullWidth={false}
                className="w-32"
              />
            )}
          </div>
          {/* No rate, no total: the building alone (or a 0) would read as the row's price. */}
          {shownRate != null && (
            <div className={clsx(lineClass, 'justify-end')}>
              <span className="text-(--palette-gray-500)">
                {t('manualCost.total')}{' '}
                <b className="font-semibold text-(--palette-ink)">
                  {total.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </b>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
