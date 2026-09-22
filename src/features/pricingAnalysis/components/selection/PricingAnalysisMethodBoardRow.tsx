import { Icon } from '@/shared/components';
import Badge from '@/shared/components/Badge';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { NumberInput, TextInput } from '@/shared/components/inputs';
import clsx from 'clsx';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUpdateMethodValue } from '../../api';
import { pricingAnalysisKeys } from '../../api/queryKeys';
import { formatDateTime } from '../../domain/formatters';
import type { UpdateMethodRequestType } from '../../schemas';
import { isServerId } from '../../store/saveEditingSelection';
import { ServerDataCtx, useSelectionState } from '../../store/selectionContext';
import {
  COST_APPROACH_TYPE,
  type ManualCostBreakdownContext,
  type Method,
  type MethodRole,
} from '../../types/selection';
import { availableRoles, requiredComponents } from '../../utils/costRequiredComponents';
import { getMethodCode } from '../../utils/methodCode';
import { ManualCostBreakdown } from './ManualCostBreakdown';

const MANUAL_VALUE_DEBOUNCE_MS = 1000;
const MANUAL_NOTE_DEBOUNCE_MS = 1000;

/** Cost-approach methods whose manual mode splits out a land-rate breakdown — mock's `LANDM`
 *  (mock:3143), gated further to the method's own `role === 'Land'` (mock:3212). Machinery/Building
 *  Cost methods must never show this: it would add a land value on top of whatever already holds
 *  their own value. */
const LAND_COMPARISON_METHOD_TYPES = ['WQS_COST', 'SAG_COST', 'DC_COST'];

/**
 * Role chip colours — the mock styles this control as a coloured pill (`.rsel`, mock:449) with
 * a per-role wash: `.r-land` green, `.r-bld` teal, `.r-mc` amber (mock:453-455). Written as hex
 * because Tailwind v4's palette is OKLCH, so `green-700` and friends no longer equal the mock's
 * values. `LandAndBuilding` has no colour of its own in the mock (it only defines three) — it
 * borrows Building's, since that is the component it adds on top of land.
 */
const ROLE_CHIP_STYLE: Record<MethodRole | 'unset', { background: string; color: string }> = {
  Land: { background: '#f0fdf4', color: '#15803d' },
  Building: { background: '#f0fdfa', color: '#0f766e' },
  LandAndBuilding: { background: '#f0fdfa', color: '#0f766e' },
  Machinery: { background: '#fffbeb', color: '#b45309' },
  unset: { background: '#edf1f1', color: '#55636f' },
};

type MethodStatusKey = 'calculated' | 'pending' | 'notIncluded';

function getMethodStatusKey(method: Method): MethodStatusKey {
  if (method.appraisalValue > 0) return 'calculated';
  if (method.isIncluded) return 'pending';
  return 'notIncluded';
}

interface PricingAnalysisMethodBoardRowProps {
  approachType: string;
  method: Method;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  onManualValueSync?: (arg: {
    approachType: string;
    methodType: string;
    value: number;
    methodId?: string;
  }) => void;
  /** Present only for the Cost approach in manual mode — see ManualCostBreakdown. */
  manualCostBreakdown?: ManualCostBreakdownContext;
  /** Cost approach only — which part of the group's value this method produces. Undefined
   *  handler means the picker isn't wired yet; the select still renders (read from method.role)
   *  so it lights up the moment a handler is passed in. */
  onSelectMethodRole?: (arg: {
    approachType: string;
    methodType: string;
    role: MethodRole;
  }) => void;
  /**
   * Bound to `Method.remark` — the "source of this value" note. The caller MUST fold this into
   * the same `updateMethod` request that writes `appraisalValue` (never a second request — see
   * useSelectionActions.ts's warning on racing writes to the same method). Per
   * UpdateMethodCommandHandler, `remark: ''` clears the note (stored as null) and any non-empty
   * string sets it — there's no null variant on this callback, so a caller can never send the
   * "leave unchanged" no-op by accident.
   *
   * Undefined (not wired yet) hides the editable input entirely — the row falls back to the
   * same read-only treatment read-only pages use, rather than rendering a box that discards
   * whatever gets typed into it.
   */
  onManualNoteSync?: (arg: {
    approachType: string;
    methodType: string;
    remark: string;
    methodId?: string;
  }) => void;
  disabled?: boolean;
}

/**
 * One method row of the approach/method board table — checkbox, name (opens the method
 * screen unless manual mode), status pill, value (input in manual mode) and a delete action.
 * Ported straight from the old PricingAnalysisMethodCard grid tile: same debounced manual-value
 * sync, same read-only rendering, same "not clickable through in manual mode" rule — just laid
 * out as table cells instead of a card.
 */
export const PricingAnalysisMethodBoardRow = ({
  approachType,
  method,
  onSelectCalculationMethod,
  onSelectCandidateMethod,
  onDeleteMethod,
  onManualValueSync,
  manualCostBreakdown,
  onSelectMethodRole,
  onManualNoteSync,
  disabled = false,
}: PricingAnalysisMethodBoardRowProps) => {
  const { t } = useTranslation('pricingAnalysis');
  const isReadOnly = usePageReadOnly();

  // This row's own edit gate — driven by the per-method System/Manual chip further down
  // (PricingAnalysisMethod.SetCalcMode), not the group-wide toggle above the board.
  // useSystemCalc: true means system-calculated, so manual mode is its negation; unset
  // defaults to system, same as the chip UI's own `?? true` below for the same field.
  const useSystemCalc = method.useSystemCalc ?? true;
  const rowManualMode = !useSystemCalc;

  // The Cost role <select> only makes sense — and only offers the roles a group can actually
  // need — when the group's own properties require components at all (mock's `GT().roles`,
  // gated by `GT().need.length` at mock:3191/3200). Same `requiredComponents` derivation
  // PricingAnalysisCostFormulaRow uses, so the two can never drift on what a group requires.
  const serverData = useContext(ServerDataCtx);
  const requiredRoleComponents = requiredComponents(serverData?.groupDetail?.properties ?? []);
  const costRoleOptions = availableRoles(requiredRoleComponents);

  const [manualInput, setManualInput] = useState<number | null>(method.appraisalValue ?? null);
  const debouncedManualInput = useDebounce(manualInput, MANUAL_VALUE_DEBOUNCE_MS);

  // Follow the value when it changes from outside this input (the System→Manual switch clears it
  // server-side, a refetch, another screen). The row is keyed by methodType and never remounts,
  // so without this the mount-time figure would be pushed back and saved over the cleared value.
  const [syncedAppraisalValue, setSyncedAppraisalValue] = useState(method.appraisalValue);
  if (method.appraisalValue !== syncedAppraisalValue) {
    setSyncedAppraisalValue(method.appraisalValue);
    setManualInput(method.appraisalValue ?? null);
  }

  // Local-only sync: 1s after the user stops typing, push the value into the reducer —
  // see PricingAnalysisMethodCard's original comment for why the equality check is what
  // stops this looping.
  useEffect(() => {
    if (!rowManualMode || !onManualValueSync) return;
    // Only a settled value the user typed: while the debounce still holds an older figure
    // (e.g. just after an external reset) it must not be written back.
    if (debouncedManualInput !== manualInput) return;
    if (debouncedManualInput == null || debouncedManualInput < 0) return;
    if (debouncedManualInput === method.appraisalValue) return;

    onManualValueSync({
      approachType,
      methodType: method.methodType,
      value: debouncedManualInput,
      methodId: method.id,
    });
  }, [
    debouncedManualInput,
    manualInput,
    rowManualMode,
    onManualValueSync,
    approachType,
    method.methodType,
    method.id,
    method.appraisalValue,
  ]);

  const handleManualChange = (e: { target: { name?: string; value: number | null } }) => {
    setManualInput(e.target.value);
  };

  const handleManualBlur = () => {
    if (!rowManualMode || !onManualValueSync) return;
    if (manualInput == null || manualInput < 0) return;
    if (manualInput === method.appraisalValue) return;

    onManualValueSync({
      approachType,
      methodType: method.methodType,
      value: manualInput,
      methodId: method.id,
    });
  };

  const handleManualKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setManualInput(method.appraisalValue ?? null);
      (e.target as HTMLInputElement).blur();
    }
  };

  const showCostBreakdown =
    !!rowManualMode &&
    !!manualCostBreakdown &&
    approachType === COST_APPROACH_TYPE &&
    method.role === 'Land' &&
    LAND_COMPARISON_METHOD_TYPES.includes(method.methodType) &&
    (manualCostBreakdown.landAreaInSqWa ?? 0) > 0;

  const handleDerivedTotal = (total: number) => {
    setManualInput(total);
    if (!onManualValueSync || total === method.appraisalValue) return;
    onManualValueSync({
      approachType,
      methodType: method.methodType,
      value: total,
      methodId: method.id,
    });
  };

  // Manual-mode note — "source of this value", bound to Method.remark. Same debounced-sync
  // shape as the price input above. Empty string is itself the clear signal (per
  // UpdateMethodCommandHandler: "" clears, omitted/null leaves untouched) — not blocked, since
  // the callback's own type (no null variant) already keeps a caller from sending a no-op clear
  // by accident.
  const savedRemark = method.remark ?? '';
  const [noteInput, setNoteInput] = useState(savedRemark);
  const debouncedNoteInput = useDebounce(noteInput, MANUAL_NOTE_DEBOUNCE_MS);

  useEffect(() => {
    if (!rowManualMode || !onManualNoteSync) return;
    if (debouncedNoteInput === savedRemark) return;

    onManualNoteSync({
      approachType,
      methodType: method.methodType,
      remark: debouncedNoteInput,
      methodId: method.id,
    });
  }, [
    debouncedNoteInput,
    rowManualMode,
    onManualNoteSync,
    savedRemark,
    approachType,
    method.methodType,
    method.id,
  ]);

  const handleNoteBlur = () => {
    if (!rowManualMode || !onManualNoteSync) return;
    if (noteInput === savedRemark) return;

    onManualNoteSync({
      approachType,
      methodType: method.methodType,
      remark: noteInput,
      methodId: method.id,
    });
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setNoteInput(savedRemark);
      (e.target as HTMLInputElement).blur();
    }
  };

  // Per-method System/Manual chip — PricingAnalysisMethod.SetCalcMode, independent of the
  // group-wide toggle above the board. Written immediately (not batched into Save like
  // onManualValueSync above) because flipping it is destructive: the server clears the
  // method's recorded value, unit type and value-per-unit as a side effect, so the row must
  // reflect that clearing right away rather than show a stale figure until the next Save.
  // Called directly against the update-method endpoint (same one onManualValueSync eventually
  // reaches at Save time) rather than threaded through a callback prop, since there's no
  // per-method "calc mode changed" callback wired from the page yet — state.pricingAnalysisId
  // comes from context instead, the same context PricingAnalysisAccordion already provides.
  const qc = useQueryClient();
  const { pricingAnalysisId } = useSelectionState();
  const updateCalcModeMutation = useUpdateMethodValue();
  const {
    isOpen: isCalcModeConfirmOpen,
    onOpen: openCalcModeConfirm,
    onClose: closeCalcModeConfirm,
  } = useDisclosure();
  const [pendingUseSystemCalc, setPendingUseSystemCalc] = useState<boolean | null>(null);

  const canChangeCalcMode = !isReadOnly && !disabled && isServerId(method.id);

  const requestCalcModeChange = (nextUseSystemCalc: boolean) => {
    if (nextUseSystemCalc === useSystemCalc) return;
    setPendingUseSystemCalc(nextUseSystemCalc);
    openCalcModeConfirm();
  };

  const cancelCalcModeChange = () => {
    setPendingUseSystemCalc(null);
    closeCalcModeConfirm();
  };

  const confirmCalcModeChange = async () => {
    if (pendingUseSystemCalc === null || !method.id || !pricingAnalysisId) return;
    try {
      await updateCalcModeMutation.mutateAsync({
        id: pricingAnalysisId,
        methodId: method.id,
        request: { useSystemCalc: pendingUseSystemCalc } as UpdateMethodRequestType,
      });
      // SetCalcMode already cleared the value server-side — refetch so this row's value/status
      // cells drop the now-stale figure instead of showing it until something else refreshes.
      await qc.invalidateQueries({ queryKey: pricingAnalysisKeys.detail(pricingAnalysisId) });
      toast.success(t('toasts.changed'));
    } catch (err: any) {
      toast.error(err?.apiError?.detail ?? t('toasts.saveFailed'));
    } finally {
      setPendingUseSystemCalc(null);
      closeCalcModeConfirm();
    }
  };

  const statusKey = getMethodStatusKey(method);
  const statusLabel = t(`methodStatus.${statusKey}` as `methodStatus.${MethodStatusKey}`);

  // Matches the reducer's own veto (SUMMARY_SELECT_METHOD: `appraisalValue <= 0` blocks a TICK) —
  // "calculated" is defined by that same field, so deriving from statusKey can't drift from
  // the reducer's check. A click the reducer would silently drop must never look clickable.
  // An already-ticked method stays clickable so it can be UNticked — the reducer allows that for
  // a zero-value method (otherwise it would stay stuck in the group's total).
  const isSelectable = statusKey === 'calculated' || method.isSelected;

  return (
    <>
      <tr
        className={clsx(
          'h-[30px]',
          method.isSelected &&
            'bg-primary/5 font-medium [&>td:first-child]:shadow-[inset_3px_0_0_#0d9488]',
        )}
      >
        <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap">
          {isReadOnly ? (
            <div
              className={clsx(
                'size-3.5 rounded-sm border flex items-center justify-center shrink-0',
                method.isSelected ? 'bg-primary border-primary' : 'border-gray-300',
              )}
            >
              {method.isSelected && (
                <Icon name="check" style="solid" className="size-2 text-white" />
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled || !isSelectable}
              aria-label={method.label}
              title={
                !isSelectable
                  ? t('board.formula.pendingWarning', { method: method.label })
                  : undefined
              }
              onClick={() =>
                onSelectCandidateMethod({ approachType, methodType: method.methodType })
              }
              className={clsx(
                'shrink-0',
                disabled || !isSelectable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              )}
            >
              <div
                className={clsx(
                  'size-3.5 rounded-sm border flex items-center justify-center transition-all',
                  method.isSelected
                    ? 'bg-primary border-primary'
                    : 'border-gray-300 hover:border-gray-400',
                )}
              >
                {method.isSelected && (
                  <Icon name="check" style="solid" className="size-2 text-white" />
                )}
              </div>
            </button>
          )}
        </td>

        <td className="px-[8px] py-0 border-r border-r-[#eef2f2]">
          {/* min-w-0: flex items default to min-width:auto, which forces this container (and
              the name truncate span/button below) to their full content width regardless of
              overflow-hidden — the table column can then never shrink narrower than the
              longest method label, which is what pushed "+ เพิ่มวิธี" off-screen at 1366px. */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon
              name={method.icon}
              style="solid"
              className={clsx(
                'size-3 shrink-0',
                method.isSelected ? 'text-primary' : 'text-gray-400',
              )}
            />
            {/* Short method-type badge — mock's `.code` chip (mock:325/3200). */}
            <span
              className="shrink-0 text-[10px] font-semibold leading-[16px] px-[5px] rounded-[4px]"
              style={{ background: '#edf1f1', color: '#55636f' }}
            >
              {getMethodCode(method.methodType)}
            </span>
            {/* Manual-mode methods are deliberately not clickable through to their method
                screen — same rule the old card's Wrapper=div enforced. */}
            {rowManualMode ? (
              <span className="text-gray-700 truncate min-w-0">{method.label}</span>
            ) : (
              <button
                type="button"
                className={clsx(
                  'text-left hover:underline cursor-pointer truncate min-w-0',
                  method.isSelected ? 'text-primary font-medium' : 'text-gray-700',
                )}
                onClick={() =>
                  onSelectCalculationMethod({ approachType, methodType: method.methodType })
                }
              >
                {method.label}
              </button>
            )}

            {/* Which part of the group's value this method produces — Cost approach only, and
                only when the group's own properties actually require a split (mock's `GT().need`
                gate at mock:3191/3200; a condo group has none and never shows this). Options are
                filtered to the roles that composition can need (mock's `GT().roles`) — a condo
                group gets nothing, a land+building group never offers Machinery, a machinery
                group never offers Land/Building. */}
            {approachType === COST_APPROACH_TYPE &&
              requiredRoleComponents.length > 0 &&
              (isReadOnly ? (
                <span
                  className="shrink-0 inline-flex h-5 items-center rounded-full px-[7px] text-[11px] font-semibold whitespace-nowrap"
                  style={ROLE_CHIP_STYLE[method.role ?? 'unset']}
                >
                  {method.role
                    ? t(`board.role.${method.role}` as `board.role.${MethodRole}`)
                    : t('board.roleUnset')}
                </span>
              ) : (
                <select
                  aria-label={t('board.roleAriaLabel', { method: method.label })}
                  disabled={disabled}
                  value={method.role ?? ''}
                  onChange={e =>
                    onSelectMethodRole?.({
                      approachType,
                      methodType: method.methodType,
                      role: e.target.value as MethodRole,
                    })
                  }
                  // Bounded instead of auto-sizing to the widest option ("Land + Building" /
                  // "ที่ดิน + อาคาร", measured ~106px EN / 92px TH) — otherwise this column's
                  // width is dictated by the select regardless of how much the row shrinks.
                  // Colour comes from ROLE_CHIP_STYLE so it reads as the mock's `.rsel` chip
                  // (mock:449) rather than a bordered form control.
                  style={ROLE_CHIP_STYLE[method.role ?? 'unset']}
                  className="shrink-0 w-[108px] text-[11px] font-semibold h-5 rounded-full border border-transparent px-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    {t('board.roleUnset')}
                  </option>
                  {/* A saved role the group no longer offers (e.g. Machinery in a land+building
                      group) is still listed, so the select shows it instead of "Not set". */}
                  {(method.role && !costRoleOptions.includes(method.role)
                    ? [...costRoleOptions, method.role]
                    : costRoleOptions
                  ).map(role => (
                    <option key={role} value={role}>
                      {t(`board.role.${role}` as `board.role.${MethodRole}`)}
                    </option>
                  ))}
                </select>
              ))}
          </div>
        </td>

        <td className="px-[8px] py-0 border-r border-r-[#eef2f2] whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {/* System/Manual — per method, independent of the group-wide toggle above the
                board (see PricingAnalysisPage's calculationMode). Read-only mirrors the
                role <select>'s pattern: a plain label instead of the interactive control. */}
            {isReadOnly ? (
              <span className="shrink-0 text-[10.5px] font-medium text-gray-500 whitespace-nowrap">
                {useSystemCalc
                  ? t('calculationMode.systemToggle')
                  : t('calculationMode.manualToggle')}
              </span>
            ) : (
              <span
                className="inline-flex shrink-0 gap-0.5 rounded-md p-0.5"
                style={{ background: '#edf1f1' }}
              >
                <button
                  type="button"
                  disabled={!canChangeCalcMode}
                  aria-pressed={useSystemCalc}
                  onClick={() => requestCalcModeChange(true)}
                  className={clsx(
                    // inline-flex + centring: the label used to sit on the font's own baseline
                    // inside the 20px box rather than in the middle of it, which read as the
                    // whole switch being off-centre against the status chip beside it.
                    'inline-flex h-5 items-center justify-center rounded px-[7px] text-[10.5px] font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60',
                    useSystemCalc
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 cursor-pointer',
                  )}
                >
                  {t('calculationMode.systemToggle')}
                </button>
                <button
                  type="button"
                  disabled={!canChangeCalcMode}
                  aria-pressed={!useSystemCalc}
                  onClick={() => requestCalcModeChange(false)}
                  className={clsx(
                    'inline-flex h-5 items-center justify-center rounded px-[7px] text-[10.5px] font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60',
                    !useSystemCalc
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-500 cursor-pointer',
                  )}
                >
                  {t('calculationMode.manualToggle')}
                </button>
              </span>
            )}

            {/* Height comes from the text's own line box, not the padding: `size="xs"` sets
                `py-0.5` (3.25px at this repo's 13px root) but no leading, so Thai glyphs'
                default line-height was what made the chip tall enough to push the 30px row.
                Pinning leading and dropping the vertical padding sizes it to the text, level
                with the 16.25px System/Manual switch beside it. Tailwind v4 wants the
                important marker as a SUFFIX — a leading `!` compiles to nothing. */}
            <Badge
              size="xs"
              dot
              badgeStyle="soft"
              type="status"
              className="py-0! leading-[14px]"
              value={
                statusKey === 'calculated'
                  ? 'completed'
                  : statusKey === 'pending'
                    ? 'draft'
                    : 'cancelled'
              }
            >
              {statusLabel}
            </Badge>
          </div>
        </td>

        <td className="px-[8px] py-0 text-right tabular-nums whitespace-nowrap">
          {rowManualMode ? (
            isReadOnly ? (
              <span className="font-semibold text-gray-800">
                {Number(method.appraisalValue).toLocaleString()}
              </span>
            ) : (
              // `justify-end`, not the cell's `text-right`. NumberInput wraps itself in a plain
              // <div>, and with fullWidth={false} that div carries no class at all — so it is a
              // block box filling the cell, and the input sits at ITS left edge. `text-align`
              // only moves inline content, so the cell's own right-alignment never reached it:
              // every other row's value is a <span> and lands hard right, while this one alone
              // sat left. A flex wrapper is what actually moves a block child.
              //
              // Fixed here rather than in NumberInput: that component is used across the whole
              // app, and making its wrapper inline-block would shift layouts nobody is looking at.
              <div className="flex justify-end">
                <NumberInput
                  dense
                  fullWidth={false}
                  className="w-32"
                  value={manualInput}
                  disabled={disabled}
                  onChange={handleManualChange}
                  onBlur={handleManualBlur}
                  onKeyDown={handleManualKeyDown}
                  decimalPlaces={2}
                  placeholder={t('board.manualValuePlaceholder')}
                />
              </div>
            )
          ) : (
            <span
              className={clsx('font-medium', method.isSelected ? 'text-primary' : 'text-gray-700')}
            >
              {Number(method.appraisalValue).toLocaleString()}
            </span>
          )}
        </td>

        <td className="px-[8px] py-0 text-[#8a96a0] whitespace-nowrap">
          {/* Null until the method's first save — the audit interceptor only stamps
              UpdatedAt on an update, so a never-edited method shows the dash. */}
          {method.updatedAt ? formatDateTime(method.updatedAt) : '—'}
        </td>

        <td className="px-[8px] py-0 text-right whitespace-nowrap">
          {/* Manual-mode methods have no open action — same "not clickable through" rule
              as the name cell above; only the delete button applies to them. */}
          {!rowManualMode && (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onSelectCalculationMethod({ approachType, methodType: method.methodType })
              }
              className="text-primary text-[12px] font-medium hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusKey === 'calculated' ? t('board.openMethod') : t('board.startCalculating')}
            </button>
          )}
          {!isReadOnly && onDeleteMethod && method.id && (
            <button
              type="button"
              disabled={disabled}
              aria-label={t('board.deleteMethodLabel')}
              title={t('board.deleteMethodLabel')}
              onClick={() => onDeleteMethod({ approachType, methodType: method.methodType })}
              className="p-1 ml-1 rounded hover:bg-red-50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon
                name="xmark"
                style="solid"
                className="size-3.5 text-gray-400 hover:text-red-500 transition-colors"
              />
            </button>
          )}
        </td>
      </tr>

      {showCostBreakdown && manualCostBreakdown && (
        <tr>
          <td></td>
          <td colSpan={5} className="px-[8px] pb-2">
            <ManualCostBreakdown
              approachType={approachType}
              method={method}
              context={manualCostBreakdown}
              onTotalChange={handleDerivedTotal}
              disabled={disabled}
              compact
            />
          </td>
        </tr>
      )}

      {/* Source-of-value note, bound to Method.remark. The editable input only ever appears
          when there's a handler to receive it — no handler means there's nowhere for typed
          text to go, so this falls back to the same read-only treatment read-only pages use
          (plain text when a remark exists, nothing when it doesn't) rather than rendering a
          box that silently discards whatever's typed into it. */}
      {rowManualMode && (savedRemark || (!isReadOnly && onManualNoteSync)) && (
        <tr>
          <td></td>
          <td colSpan={5} className="px-[8px] pb-2">
            {!isReadOnly && onManualNoteSync ? (
              <TextInput
                dense
                value={noteInput}
                disabled={disabled}
                onChange={e => setNoteInput(e.target.value)}
                onBlur={handleNoteBlur}
                onKeyDown={handleNoteKeyDown}
                placeholder={t('board.manualNotePlaceholder', { method: method.label })}
                aria-label={t('board.manualNoteAriaLabel', { method: method.label })}
                // `dense` is sized for the numeric cells in this table, so it also right-aligns
                // (Input.tsx) — which put this note's text and caret at the far right, typing
                // away from the eye. Prose belongs on the left. Kept dense for the height (a
                // non-dense box is ~38px and would burst the 30px row) but given a little more
                // room and normal padding so it reads and clicks like a text field.
                className="w-full text-left! h-[26px] px-2"
              />
            ) : (
              <p className="text-[11px] text-gray-500 italic">{savedRemark}</p>
            )}
          </td>
        </tr>
      )}

      <ConfirmDialog
        isOpen={isCalcModeConfirmOpen}
        onClose={cancelCalcModeChange}
        onConfirm={confirmCalcModeChange}
        title={t('confirm.changeMethodCalculationTitle')}
        message={t('confirm.changeMethodCalculationMessage', {
          method: method.label,
          mode: pendingUseSystemCalc
            ? t('calculationMode.systemToggle')
            : t('calculationMode.manualToggle'),
        })}
        confirmText={t('confirm.confirmText')}
        variant="warning"
        isLoading={updateCalcModeMutation.isPending}
      />
    </>
  );
};
