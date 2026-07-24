import type { Approach, Method } from '../types/selection';
import type { PricingAnalysisDocumentDtoType } from '../schemas';

/*
// state to collect approach & method which selected
  select condition:
  1. every method must calculate
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
  // Track selected method or approach change
  dirtyMethodApproachTypes: string[];
  /** True when the final approach selection has changed locally since the last successful
   *  Save Summary. Populated by SUMMARY_SELECT_APPROACH, consumed by saveSummary to know
   *  whether a selectApproach call is needed, cleared by SUMMARY_SAVE. */
  dirtyApproachSelection: boolean;

  /** Set by PREPARE_SELECTION_RESET right before a quick Add Method / Delete Method
   *  mutation is fired. Consumed by the next INIT (triggered by that mutation's query
   *  invalidation) to blank out every approach/method's isSelected instead of trusting
   *  the server's stale selection flags — the backend doesn't clear them on add/delete. */
  pendingSelectionReset?: boolean;

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
  | { type: 'PREPARE_SELECTION_RESET' }
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

const checkMethodIsSelected = (methods: Method[]): string | null => {
  return methods.find(method => method.isSelected)?.methodType ?? null;
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
      const resetSelection = !!state.pendingSelectionReset;

      // A quick Add Method / Delete Method mutation just landed — the server doesn't
      // clear prior selections on its own, so blank them out here rather than trusting
      // the (stale) isSelected flags in the freshly-fetched approaches.
      const approaches = resetSelection
        ? action.payload.approaches.map(appr => ({
            ...appr,
            isSelected: false,
            methods: appr.methods.map(method => ({ ...method, isSelected: false })),
          }))
        : action.payload.approaches;
      const visibleApproach = getVisibleApproach(approaches);

      return {
        viewMode: 'summary',
        editSaved: cloneApproaches(approaches),
        editDraft: cloneApproaches(approaches),
        summarySelected: cloneApproaches(visibleApproach),
        systemCalculationMode: action.payload.useSystemCalc === false ? 'FillIn' : 'System',
        pricingAnalysisId: action.payload.pricingAnalysisId,
        remark: action.payload.remark ?? null,
        documents: action.payload.documents ?? [],
        // Preserve activeMethod across re-INIT (e.g. detail query refetch after save)
        // so the open calculation panel doesn't unmount mid-edit.
        activeMethod: state.activeMethod,
        // Preserve across re-INIT too (e.g. a background refetch firing between the user
        // typing a manual value and clicking Save shouldn't drop the pending dirty flag).
        dirtyManualValueKeys: state.dirtyManualValueKeys ?? [],
        // A reset baseline has nothing dirty against it yet.
        dirtyMethodApproachTypes: resetSelection ? [] : (state.dirtyMethodApproachTypes ?? []),
        dirtyApproachSelection: resetSelection ? false : (state.dirtyApproachSelection ?? false),
        pendingSelectionReset: false,
      };
    }

    /** Marks that the next INIT (triggered by the in-flight Add/Delete Method mutation's
     *  query invalidation) must blank out every approach/method selection. */
    case 'PREPARE_SELECTION_RESET': {
      return {
        ...state,
        pendingSelectionReset: true,
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

      // every selected method must have value system will allow user to select method
      if (
        state.summarySelected.some(appr => appr.methods.some(method => method.appraisalValue <= 0))
      )
        return state;

      // Determine up front whether this actually changes the target approach's selected
      // method — reselecting the already-selected method is a no-op, and must NOT flag
      // the approach dirty (nothing to send to the server).
      const targetApproachForMethod = state.summarySelected.find(
        appr => appr.approachType === action.payload.approachType,
      );
      const currentlySelectedMethod = targetApproachForMethod
        ? checkMethodIsSelected(targetApproachForMethod.methods)
        : null;
      const isRealMethodChange =
        !!targetApproachForMethod && action.payload.methodType !== currentlySelectedMethod;

      // if any method has select, clear that method and enable selected one
      const nextState: SelectionState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => {
          if (appr.approachType !== action.payload.approachType) return appr;

          const selectedMethod = checkMethodIsSelected(appr.methods);
          if (action.payload.methodType === selectedMethod) return appr;

          return {
            ...appr,
            appraisalValue:
              appr.methods.find(method => method.methodType === action.payload.methodType)
                ?.appraisalValue ?? 0,
            methods: appr.methods.map(method => ({
              ...method,
              isSelected: method.methodType === action.payload.methodType,
            })),
          };
        }),
        dirtyMethodApproachTypes:
          isRealMethodChange &&
          !state.dirtyMethodApproachTypes.includes(action.payload.approachType)
            ? [...state.dirtyMethodApproachTypes, action.payload.approachType]
            : state.dirtyMethodApproachTypes,
      };
      return nextState;
    }

    case 'SUMMARY_SELECT_APPROACH': {
      if (state.summarySelected == null) return state;

      // every approach must have a selected method
      const allApproachHaveSelected = state.summarySelected.every(appr =>
        appr.methods.some(method => method.isSelected),
      );

      if (!allApproachHaveSelected) return state;

      const selectedApproach = checkApproachIsSelected(state.summarySelected);
      if (action.payload.approachType === selectedApproach) return state;

      const nextState: SelectionState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => ({
          ...appr,
          isSelected: appr.approachType === action.payload.approachType,
        })),
        // The guard above already early-returned if this approach was already the final
        // one, so reaching here always means a real change.
        dirtyApproachSelection: true,
      };
      return nextState;
    }

    /** Fired by saveSummary once a Save Summary click has fully succeeded server-side.
     *  Clears all three dirty trackers so the next save only sends new changes. */
    case 'SUMMARY_SAVE': {
      if (
        state.dirtyManualValueKeys.length === 0 &&
        state.dirtyMethodApproachTypes.length === 0 &&
        !state.dirtyApproachSelection
      )
        return state;

      return {
        ...state,
        dirtyManualValueKeys: [],
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

    default:
      return state;
  }
}
