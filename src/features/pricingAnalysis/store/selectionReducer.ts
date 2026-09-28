import type { Approach } from '../types/selection';
import { COST_APPROACH_TYPE } from '../types/selection';
import type { PricingAnalysisDocumentDtoType } from '../schemas';

/*
// state to collect approach & method which selected
  select condition:
  1. the method being selected must have a calculated value (other methods' readiness doesn't matter)
  2. one method must be select
  3. one approach must be select
*/
export type ViewMode = 'editing' | 'summary';
export type SystemCalculationMode = 'System' | 'FillIn';

/**
 * states that keep on reducer:
 * viewMode - mode to display price analysis selection screen. Selection screen can switch between two modes: editing and summary mode
 * editDraft - list of approaches which are temporarily selected in editing mode. after click save on editing mode, lists will be copied to editSaved
 * editSaved - list of approaches which are selected and save in editing mode. use for compare approach changes between editing mode and summary mode
 * summarySelected - list of method and approach that will be shown on summary mode (filter methods and approaches that are not selected out).
 */
export type SelectionState = {
  viewMode: ViewMode;

  editDraft: Approach[];
  editSaved: Approach[];

  summarySelected: Approach[];

  systemCalculationMode: SystemCalculationMode;

  // Track dirty method value change
  dirtyManualValueKeys: string[];
  /** Methods whose manual Cost land rate changed — tracked apart from dirtyManualValueKeys so a
   *  method that only had its price edited is never sent a null rate, which would delete a
   *  breakdown it never had (a MachineryCost method's FMV row, say). */
  dirtyCostBreakdownKeys: string[];
  /** Methods whose manual-mode "source of this value" note (Method.remark) changed — folded
   *  into the same updateMethod request as dirtyManualValueKeys at Save, never a separate one
   *  (see PricingAnalysisMethodBoardRow's onManualNoteSync contract). */
  dirtyMethodRemarkKeys: string[];
  // Track selected method or approach change
  dirtyMethodApproachTypes: string[];
  /** True when the final approach selection has changed locally since the last successful
   *  Save Summary. Populated by SUMMARY_SELECT_APPROACH, consumed by saveSummary to know
   *  whether a selectApproach call is needed, cleared by SUMMARY_SAVE. */
  dirtyApproachSelection: boolean;

  pricingAnalysisId?: string;

  /** Analysis-level remark ("Notes & Assumptions"), loaded from the server on INIT and
   *  persisted via UpdateRemark as part of the batched Save Summary click. */
  remark?: string | null;

  /** Documents already attached to this analysis (loaded from the server on INIT).
   *  Distinct from the pending-upload queue in PricingAnalysisApproachMethodSelector —
   *  these are already persisted; removal is immediate (not batched into Save Summary). */
  documents?: PricingAnalysisDocumentDtoType[];

  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
};

export type SelectionAction =
  | {
      type: 'INIT';
      payload: {
        pricingAnalysisId?: string;
        approaches: Approach[];
        useSystemCalc?: boolean;
        remark?: string | null;
        documents?: PricingAnalysisDocumentDtoType[];
      };
    }
  | {
      type: 'CHANGE_CALCULATION_METHOD';
      payload: { systemCalculationMethodType: SystemCalculationMode };
    }
  | { type: 'EDIT_ENTER' }
  | { type: 'EDIT_TOGGLE_METHOD'; payload: { approachType: string; methodType: string } }
  | { type: 'EDIT_CANCEL' }
  | { type: 'EDIT_SAVE' }
  | { type: 'SUMMARY_ENTER' }
  | { type: 'SUMMARY_SELECT_METHOD'; payload: { approachType: string; methodType: string } }
  | { type: 'SUMMARY_SELECT_APPROACH'; payload: { approachType: string } }
  | { type: 'SUMMARY_SAVE' }
  | {
      type: 'CALCULATION_SELECTED';
      payload: {
        pricingAnalysisId: string;
        approachId: string;
        approachType: string;
        methodId: string;
        methodType: string;
      };
    }
  | {
      type: 'CALCULATION_ENTER';
    }
  | {
      type: 'CALCULATION_CANCEL';
    }
  | {
      type: 'CALCULATION_SAVE';
      payload: { approachType: string; methodType: string; appraisalValue: number };
    } // TODO: remove this state if api ready
  | {
      /** Local-only sync fired both immediately on blur and ~1s after the user stops
       *  typing in a manual-mode value input (see PricingAnalysisMethodCard). Does not
       *  touch the server — saveSummary (useSelectionActions) persists dirtyManualValueKeys
       *  as part of the batched Save click. */
      type: 'SUMMARY_UPDATE_METHOD_VALUE';
      payload: { approachType: string; methodType: string; value: number; methodId?: string };
    }
  | {
      /** Local-only, same batching as SUMMARY_UPDATE_METHOD_VALUE. Records the land price per
       *  square wa an appraiser types on a manual Cost-approach method; saveSummary sends it to
       *  the manual-cost-breakdown endpoint instead of the plain method-value one. A null rate
       *  clears the breakdown. */
      type: 'SUMMARY_UPDATE_METHOD_LAND_RATE';
      payload: {
        approachType: string;
        methodType: string;
        rate: number | null;
        methodId?: string;
      };
    }
  | {
      /** Local-only, same batching as SUMMARY_UPDATE_METHOD_VALUE — the manual-mode note
       *  input debounces into here, and saveSummary sends it folded into the same
       *  updateMethod request as the method's value. */
      type: 'SUMMARY_UPDATE_METHOD_REMARK';
      payload: {
        approachType: string;
        methodType: string;
        remark: string;
        methodId?: string;
      };
    };

/** filter out approaches and methods that are not selected in editing mode
 * @param approaches - approaches which want to filter out
 */
const getVisibleApproach = (approaches: Approach[] = []) => {
  return approaches
    .filter(appr => appr.methods.some(method => method.isIncluded))
    .map(appr => ({ ...appr, methods: appr.methods.filter(method => method.isIncluded) }));
};

/** convert visible approaches and methods into one string to compare changes */
const selectionKey = (approaches: Approach[] = []) => {
  return getVisibleApproach(approaches)
    .map(appr => {
      const methodTypes = appr.methods
        .map(m => m.methodType)
        .sort()
        .join(',');
      return `${appr.approachType}:${methodTypes}`;
    })
    .sort()
    .join('}');
};

const checkApproachIsSelected = (approaches: Approach[]): string | null => {
  return approaches.find(appr => appr.isSelected)?.approachType ?? null;
};

const cloneApproaches = (approaches: Approach[]): Approach[] => {
  return approaches
    ? approaches.map(appr => ({
        ...appr,
        methods: appr.methods.map(method => ({ ...method })),
      }))
    : [];
};

export function approachMethodReducer(
  state: SelectionState,
  action: SelectionAction,
): SelectionState {
  switch (action.type) {
    /** Initial state:
     * - initial approach and method which are loaded from configuration and database
     */
    case 'INIT': {
      // The server's isSelected flags are always authoritative here — AddMethod never
      // touches an existing method's selection, and RemoveMethod already clears the
      // affected approach's IsSelected (and the analysis's FinalAppraisedValue) itself
      // when the removed method was the selected one. Every other approach/method is
      // untouched by either mutation, so there is nothing here to distrust.
      const approaches = action.payload.approaches;
      const visibleApproach = getVisibleApproach(approaches);

      // Unsaved edits survive a refetch. The dirty flags below are preserved across re-INIT, so the
      // state they describe must be too — otherwise a refetch triggered by some other edit (role
      // change, added method, another row's calc-mode flip) reverts it on screen while Save still
      // thinks it has something to send:
      //   • ticks, for approaches with pending selection edits (dirtyMethodApproachTypes), and the
      //     approach tick itself when dirtyApproachSelection;
      //   • a typed manual value, for methods in dirtyManualValueKeys.
      // Everything else comes fresh from the server; a touched approach's total is re-derived
      // from the kept state the same way SUMMARY_SELECT_METHOD does (Cost sums, others take one).
      const dirtyTypes = state.dirtyMethodApproachTypes ?? [];
      const dirtyValueIds = state.dirtyManualValueKeys ?? [];
      const previousMethods = (state.summarySelected ?? []).flatMap(a => a.methods);
      const flippedIds = new Set(
        visibleApproach
          .flatMap(a => a.methods)
          .filter(m => {
            const prev = previousMethods.find(pm => pm.id && pm.id === m.id);
            return !!m.id && !!prev && prev.useSystemCalc !== m.useSystemCalc;
          })
          .map(m => m.id as string),
      );
      const summarySelected = cloneApproaches(visibleApproach).map(appr => {
        const previous = state.summarySelected?.find(p => p.approachType === appr.approachType);
        if (!previous) return appr;
        const keepTicks = dirtyTypes.includes(appr.approachType);
        let touched = false;
        const methods = appr.methods.map(m => {
          const prevMethod = previous.methods.find(pm =>
            m.id ? pm.id === m.id : pm.methodType === m.methodType,
          );
          if (!prevMethod) return m;
          // Never across a System/Manual flip: the flip unselects the method and clears its value
          // server-side on purpose, so neither the local tick nor the typed figure may come back.
          const modeFlipped = prevMethod.useSystemCalc !== m.useSystemCalc;
          if (modeFlipped) return m;
          const keepValue = !!m.id && dirtyValueIds.includes(m.id);
          if (!keepTicks && !keepValue) return m;
          touched = true;
          return {
            ...m,
            isSelected: keepTicks ? prevMethod.isSelected : m.isSelected,
            appraisalValue: keepValue ? prevMethod.appraisalValue : m.appraisalValue,
          };
        });
        const selectedMethods = methods.filter(m => m.isSelected);
        return {
          ...appr,
          // A kept approach tick needs a ticked method under it — a flip may have just released
          // the only one, which would otherwise leave the approach as the group's value at 0.
          isSelected:
            state.dirtyApproachSelection && (!previous.isSelected || selectedMethods.length > 0)
              ? previous.isSelected
              : appr.isSelected,
          methods,
          appraisalValue: !touched
            ? appr.appraisalValue
            : appr.approachType === COST_APPROACH_TYPE
              ? selectedMethods.reduce((sum, m) => sum + (m.appraisalValue ?? 0), 0)
              : (selectedMethods[0]?.appraisalValue ?? 0),
        };
      });

      return {
        viewMode: 'summary',
        editSaved: cloneApproaches(approaches),
        editDraft: cloneApproaches(approaches),
        summarySelected,
        systemCalculationMode: action.payload.useSystemCalc === false ? 'FillIn' : 'System',
        pricingAnalysisId: action.payload.pricingAnalysisId,
        remark: action.payload.remark ?? null,
        documents: action.payload.documents ?? [],
        // Preserve activeMethod across re-INIT (e.g. detail query refetch after save)
        // so the open calculation panel doesn't unmount mid-edit.
        activeMethod: state.activeMethod,
        // Preserve across re-INIT too (e.g. a background refetch firing between the user
        // typing a manual value and clicking Save shouldn't drop the pending dirty flag).
        // A method whose System/Manual mode flipped server-side has no pending typed value any more
        // (the flip cleared it); keeping its key would make Save write methodValue 0 over null.
        dirtyManualValueKeys: (state.dirtyManualValueKeys ?? []).filter(id => !flippedIds.has(id)),
        dirtyCostBreakdownKeys: state.dirtyCostBreakdownKeys ?? [],
        // Same for a note typed on a method that has since flipped to System (its note box is gone).
        dirtyMethodRemarkKeys: (state.dirtyMethodRemarkKeys ?? []).filter(id => !flippedIds.has(id)),
        dirtyMethodApproachTypes: state.dirtyMethodApproachTypes ?? [],
        dirtyApproachSelection: state.dirtyApproachSelection ?? false,
      };
    }

    case 'CHANGE_CALCULATION_METHOD': {
      return {
        ...state,
        systemCalculationMode: action.payload.systemCalculationMethodType,
      };
    }

    /** Enter edit mode state:
     * - set viewMode to 'editing'
     */
    case 'EDIT_ENTER': {
      const nextState: SelectionState = {
        ...state,
        viewMode: 'editing',
      };
      return nextState;
    }

    /** Toggle method state:
     * - find the payload method in editDraft. check did it be selected or not. if it was selected, change the status to 'not selected'. if it was not selected, change the status to 'selected'
     */
    case 'EDIT_TOGGLE_METHOD': {
      if (state.editDraft == null) return state;
      if (!state.editDraft.find(appr => appr.approachType === action.payload.approachType))
        return state;

      const nextState: SelectionState = {
        ...state,
        editDraft: state.editDraft.map(appr => {
          /** if approach not matches the payload, return it */
          if (appr.approachType !== action.payload.approachType) return appr;
          /** if approach matches the payload, loop finds a matching method type */
          return {
            ...appr,
            /** either select or deselect, reset approach's appraisal value to 0 and reset selection */
            appraisalValue: 0,
            isSelected: false,
            methods: appr.methods.map(method => {
              /** if a method type not matches, return it */
              if (method.methodType !== action.payload.methodType) return method;

              /** if a method type is match and method is included, flip the status to false */
              if (method.isIncluded) return { ...method, appraisalValue: 0, isIncluded: false };

              /** if a method type is match and method is not included, flip status to true */
              return { ...method, appraisalValue: 0, isIncluded: true };
            }),
          };
        }),
      };

      return nextState;
    }

    /** Cancel editing method stage
     * - replace editDraft(changing method) with editSaved(before method change).
     * - In this stage, editDraft and editSaved will equal.
     */
    case 'EDIT_CANCEL': {
      const nextState: SelectionState = {
        ...state,
        editDraft: cloneApproaches(state.editSaved),
        viewMode: 'summary',
      };
      return nextState;
    }

    /** Save editing changes in editing mode state: */
    case 'EDIT_SAVE': {
      if (state.editDraft == null) return state;

      /** compare changes between editDraft and editSaved */
      const changed = selectionKey(state.editDraft) !== selectionKey(state.editSaved);

      let visibleApproach = getVisibleApproach(state.editDraft);

      /** If changed, reset selection and appraisal value of approach by 0 */
      if (changed) {
        visibleApproach = visibleApproach.map(appr => ({
          ...appr,
          /** reset selection and approach's appraisal value to 0  */
          appraisalValue: 0,
          isSelected: false,
          methods: appr.methods.map(method => {
            return {
              ...method,
              isSelected: false,
            };
          }),
        }));
      }

      /** update editSaved equal to editDraft and update summarySelected with visible approach */
      const nextState: SelectionState = {
        ...state,
        activeMethod: undefined,
        editSaved: cloneApproaches(state.editDraft),
        summarySelected: cloneApproaches(visibleApproach),
        viewMode: 'summary',
      };
      return nextState;
    }

    case 'SUMMARY_ENTER': {
      if (state.summarySelected == null) return state;

      const visibleApproach = getVisibleApproach(state.summarySelected);

      const nextState: SelectionState = {
        ...state,
        summarySelected: cloneApproaches(visibleApproach),
        viewMode: 'summary',
      };
      return nextState;
    }

    case 'SUMMARY_SELECT_METHOD': {
      if (state.summarySelected == null) return state;

      // The box is a toggle: a click either ticks the method or unticks it, and both are
      // real changes that have to reach the server. (It used to treat a click on an
      // already-ticked method as a no-op, which is why nothing could be unticked.) Cost
      // approaches can hold several ticked methods at once — one per Role — so "already
      // ticked" is a per-method question, never a per-approach one.
      const targetApproachForMethod = state.summarySelected.find(
        appr => appr.approachType === action.payload.approachType,
      );
      const targetMethod = targetApproachForMethod?.methods.find(
        method => method.methodType === action.payload.methodType,
      );

      // Only the method being selected must have a value — other methods (possibly not
      // yet calculated) are irrelevant to this click. Was previously scanning every
      // method in every approach, which meant one uncalculated method anywhere silently
      // vetoed every selection click. The value rule guards *selecting* only: a method
      // already ticked whose value later went back to 0 (recalculated, reset) must still
      // be untickable, or it stays stuck in the group's total with no way out.
      if (!targetMethod) return state;
      if (!targetMethod.isSelected && targetMethod.appraisalValue <= 0) return state;

      const isDeselecting = targetMethod.isSelected;

      // Picking the first method anywhere also makes its approach the group's value, so the
      // appraiser isn't left with a complete approach that still fails "no approach selected"
      // on save. Only when nothing is chosen yet — once an approach is final, choosing a
      // method elsewhere must not silently move the group's value to another approach.
      // Never on an untick: releasing a method must not turn round and make its approach the
      // group's value, which is the opposite of what the appraiser just asked for.
      const shouldAutoSelectApproach =
        !isDeselecting && checkApproachIsSelected(state.summarySelected) === null;

      // if any method has select, clear that method and enable selected one
      const nextState: SelectionState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => {
          if (appr.approachType !== action.payload.approachType) return appr;

          // Mirrors BE PricingAnalysisApproach.SelectMethod: a Cost method with a Role
          // deselects only siblings sharing that Role, so a Land-role and a Building-role
          // method can be selected at once. Every other case (non-Cost, or a Cost method
          // with a null Role — should not normally happen) stays exclusive.
          const isRoleScoped = appr.approachType === COST_APPROACH_TYPE && !!targetMethod?.role;

          const nextMethods = appr.methods.map(method => {
            if (method.methodType === action.payload.methodType)
              return { ...method, isSelected: !isDeselecting };
            // Unticking touches only the clicked method — its siblings keep whatever they
            // had, so unticking Building in a Cost approach leaves Land selected.
            if (isDeselecting) return method;
            if (isRoleScoped)
              return method.role === targetMethod!.role ? { ...method, isSelected: false } : method;
            return { ...method, isSelected: false };
          });

          const selectedMethods = nextMethods.filter(method => method.isSelected);

          return {
            ...appr,
            // Mirrors BE ComputeSelectedValue: Cost sums every selected method's value
            // (each carries a distinct Role, so no double-counting); every other approach
            // type still has exactly one selected method, same as before.
            appraisalValue:
              appr.approachType === COST_APPROACH_TYPE
                ? selectedMethods.reduce((sum, method) => sum + (method.appraisalValue ?? 0), 0)
                : (selectedMethods[0]?.appraisalValue ?? 0),
            methods: nextMethods,
          };
        }),
        // Both directions are dirty — an untick that never reaches the server would come
        // straight back on the next load.
        dirtyMethodApproachTypes: state.dirtyMethodApproachTypes.includes(
          action.payload.approachType,
        )
          ? state.dirtyMethodApproachTypes
          : [...state.dirtyMethodApproachTypes, action.payload.approachType],
        // Flagged so saveSummary actually sends the auto-pick — without it the approach would
        // look selected on screen and never reach the server (SUMMARY_SELECT_APPROACH sets the
        // same flag for the manual path).
        dirtyApproachSelection: shouldAutoSelectApproach || state.dirtyApproachSelection,
      };

      // Applied outside the map above: that map early-returns for every other approach, so it
      // cannot clear their isSelected — and this branch only runs when none was set anyway.
      if (shouldAutoSelectApproach) {
        nextState.summarySelected = nextState.summarySelected.map(appr => ({
          ...appr,
          isSelected: appr.approachType === action.payload.approachType,
        }));
      }

      // Unticking the approach's last method leaves it holding the group's value with nothing
      // backing it, which the server rejects outright (PricingAnalysis.SelectApproach: "Cannot
      // select an approach that has no selected method"). Releasing it here keeps the failure
      // on the click the appraiser just made instead of surfacing it later on Save.
      if (isDeselecting) {
        const emptied = nextState.summarySelected.find(
          appr =>
            appr.approachType === action.payload.approachType &&
            appr.isSelected &&
            !appr.methods.some(method => method.isSelected),
        );
        if (emptied) {
          nextState.summarySelected = nextState.summarySelected.map(appr =>
            appr.approachType === action.payload.approachType
              ? { ...appr, isSelected: false }
              : appr,
          );
          nextState.dirtyApproachSelection = true;
        }
      }
      return nextState;
    }

    case 'SUMMARY_SELECT_APPROACH': {
      if (state.summarySelected == null) return state;

      // Only the approach being picked has to have a selected method — the same rule the
      // server enforces (PricingAnalysis.SelectApproach: "Cannot select an approach that has
      // no selected method"). Requiring it of *every* approach also blocked picking a
      // complete approach while another one was still empty.
      const target = state.summarySelected.find(
        appr => appr.approachType === action.payload.approachType,
      );
      if (!target?.methods.some(method => method.isSelected)) return state;

      // Clicking the approach already chosen releases it rather than doing nothing, so the
      // group can be left with no final approach on purpose — the same toggle the method
      // boxes above give. Save still refuses an empty selection (useSelectionActions), with
      // a message, which is a better place to say so than a box that silently won't untick.
      const selectedApproach = checkApproachIsSelected(state.summarySelected);
      const isReleasing = action.payload.approachType === selectedApproach;

      const nextState: SelectionState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => ({
          ...appr,
          isSelected: isReleasing ? false : appr.approachType === action.payload.approachType,
        })),
        dirtyApproachSelection: true,
      };
      return nextState;
    }

    /** Fired by saveSummary once a Save Summary click has fully succeeded server-side.
     *  Clears all three dirty trackers so the next save only sends new changes. */
    case 'SUMMARY_SAVE': {
      if (
        state.dirtyManualValueKeys.length === 0 &&
        state.dirtyCostBreakdownKeys.length === 0 &&
        state.dirtyMethodRemarkKeys.length === 0 &&
        state.dirtyMethodApproachTypes.length === 0 &&
        !state.dirtyApproachSelection
      )
        return state;

      return {
        ...state,
        dirtyManualValueKeys: [],
        dirtyCostBreakdownKeys: [],
        dirtyMethodRemarkKeys: [],
        dirtyMethodApproachTypes: [],
        dirtyApproachSelection: false,
      };
    }

    case 'CALCULATION_SELECTED': {
      return {
        ...state,
        activeMethod: {
          pricingAnalysisId: action.payload.pricingAnalysisId,
          approachId: action.payload.approachId,
          approachType: action.payload.approachType,
          methodId: action.payload.methodId,
          methodType: action.payload.methodType,
        },
      };
    }

    case 'CALCULATION_ENTER': {
      return state;
    }

    /** clear active method */
    case 'CALCULATION_CANCEL': {
      return {
        ...state,
        activeMethod: {
          ...state.activeMethod,
          approachId: undefined,
          approachType: undefined,
          methodId: undefined,
          methodType: undefined,
        },
      };
    }

    case 'CALCULATION_SAVE': {
      if (
        !action.payload.approachType ||
        !action.payload.methodType ||
        !action.payload.appraisalValue
      )
        return state;

      const nextState: SelectionState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => {
          const updatedMethods = appr.methods.map(method => {
            if (
              method.methodType === action.payload.methodType &&
              appr.approachType === action.payload.approachType
            )
              return {
                ...method,
                appraisalValue: action.payload.appraisalValue,
              };
            return method;
          });
          const selectedMethod = updatedMethods.find(m => m.isSelected);
          return {
            ...appr,
            methods: updatedMethods,
            appraisalValue: selectedMethod?.appraisalValue ?? appr.appraisalValue,
          };
        }),
      };
      return nextState;
    }

    case 'SUMMARY_UPDATE_METHOD_VALUE': {
      if (state.summarySelected == null) return state;
      if (action.payload.value == null || action.payload.value < 0) return state;

      const nextState: SelectionState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => {
          if (appr.approachType !== action.payload.approachType) return appr;

          const updatedMethods = appr.methods.map(method => {
            if (method.methodType !== action.payload.methodType) return method;
            return { ...method, appraisalValue: action.payload.value };
          });

          const selectedMethod = updatedMethods.find(m => m.isSelected);
          return {
            ...appr,
            methods: updatedMethods,
            // Keep the approach's own appraisalValue in sync only when the edited
            // method is the one currently selected — mirrors CALCULATION_SAVE.
            appraisalValue: selectedMethod?.appraisalValue ?? appr.appraisalValue,
          };
        }),
        dirtyManualValueKeys:
          action.payload.methodId && !state.dirtyManualValueKeys.includes(action.payload.methodId)
            ? [...state.dirtyManualValueKeys, action.payload.methodId]
            : state.dirtyManualValueKeys,
      };

      return nextState;
    }

    case 'SUMMARY_UPDATE_METHOD_LAND_RATE': {
      if (state.summarySelected == null) return state;

      return {
        ...state,
        summarySelected: state.summarySelected.map(appr => {
          if (appr.approachType !== action.payload.approachType) return appr;

          return {
            ...appr,
            methods: appr.methods.map(method =>
              method.methodType === action.payload.methodType
                ? { ...method, landRatePerSqWa: action.payload.rate }
                : method,
            ),
          };
        }),
        dirtyCostBreakdownKeys:
          action.payload.methodId && !state.dirtyCostBreakdownKeys.includes(action.payload.methodId)
            ? [...state.dirtyCostBreakdownKeys, action.payload.methodId]
            : state.dirtyCostBreakdownKeys,
      };
    }

    case 'SUMMARY_UPDATE_METHOD_REMARK': {
      if (state.summarySelected == null) return state;

      return {
        ...state,
        summarySelected: state.summarySelected.map(appr => {
          if (appr.approachType !== action.payload.approachType) return appr;

          return {
            ...appr,
            methods: appr.methods.map(method =>
              method.methodType === action.payload.methodType
                ? { ...method, remark: action.payload.remark }
                : method,
            ),
          };
        }),
        dirtyMethodRemarkKeys:
          action.payload.methodId && !state.dirtyMethodRemarkKeys.includes(action.payload.methodId)
            ? [...state.dirtyMethodRemarkKeys, action.payload.methodId]
            : state.dirtyMethodRemarkKeys,
      };
    }

    default:
      return state;
  }
}
