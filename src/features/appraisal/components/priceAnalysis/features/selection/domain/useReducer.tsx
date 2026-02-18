import type { Approach, GroupDetails, Method } from '../type';
import type {
  FactorDataType,
  GetComparativeFactorsResponseType,
  MarketComparableDetailType,
  TemplateDetailType,
} from '../../../schemas/v1';

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
export type PriceAnalysisSelectorState = {
  viewMode: ViewMode;

  editDraft: Approach[];
  editSaved: Approach[];

  summarySelected: Approach[];

  systemCalculationMode: SystemCalculationMode;

  activeMethod?: { approachId: string; approachType: string; methodId: string; methodType: string };
  groupDetails?: GroupDetails;
  property?: Record<string, unknown>;
  marketSurveys?: MarketComparableDetailType[];
  allFactors?: FactorDataType[];
  methodTemplates?: TemplateDetailType[];
  comparativeFactors?: GetComparativeFactorsResponseType;
};

export type PriceAnalysisSelectorAction =
  | {
      type: 'INIT';
      payload: {
        approaches: Approach[];
        groupDetails: GroupDetails;
        property: Record<string, unknown>;
        marketSurveys: MarketComparableDetailType[];
        allFactors: FactorDataType[];
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
      payload: { approachId: string; approachType: string; methodId: string; methodType: string };
    }
  | {
      type: 'CALCULATION_ENTER';
      payload: {
        approachId: string;
        methodId: string;
        methodType: string;
        allFactors: FactorDataType[];
        templates?: TemplateDetailType[];
        comparativeFactors?: GetComparativeFactorsResponseType;
      };
    };

/** filter out approaches and methods that are not selected in editing mode
 * @param approaches - approaches which want to filter out
 */
const getVisibleApproach = (approaches: Approach[] = []) => {
  return approaches
    .filter(appr => appr.methods.some(method => method.isSelected))
    .map(appr => ({ ...appr, methods: appr.methods.filter(method => method.isSelected) }));
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

const checkMethodIsCandidated = (methods: Method[]): string | null => {
  return methods.find(method => method.isCandidated)?.methodType ?? null;
};

const checkApproachIsCandidated = (approaches: Approach[]): string | null => {
  return approaches.find(appr => appr.isCandidated)?.approachType ?? null;
};

const sortApproaches = (approaches: Approach[]): Approach[] | null => {
  if (!approaches) return null;

  return approaches
    .map(appr => ({
      ...appr,
      methods: [...appr.methods].sort((prev, curr) =>
        prev.methodType.localeCompare(curr.methodType),
      ), // clone then sort
    }))
    .sort((prev, curr) => prev.approachType.localeCompare(curr.approachType)); // sorting mapped array is fine
};

const cloneApproaches = (approaches: Approach[]): Approach[] => {
  return approaches
    ? approaches.map(appr => ({
        ...appr,
        methods: appr.methods.map(method => ({ ...method })),
      }))
    : [];
};

const diffApproaches = (oldApproaches: Approach[], newApproaches: Approach[]) => {};

export function approachMethodReducer(
  state: PriceAnalysisSelectorState,
  action: PriceAnalysisSelectorAction,
): PriceAnalysisSelectorState {
  switch (action.type) {
    /** Initial state:
     * - initial approach and method which are loaded from configuration and database
     */
    case 'INIT': {
      // const sorted = sortApproaches(action.payload.approaches) ?? null;

      const approaches = action.payload.approaches;
      const visibleApproach = getVisibleApproach(action.payload.approaches);

      return {
        viewMode: 'summary',
        editSaved: cloneApproaches(approaches),
        editDraft: cloneApproaches(approaches),
        summarySelected: cloneApproaches(visibleApproach),
        systemCalculationMode: 'System',

        groupDetails: action.payload.groupDetails,
        property: action.payload.property,
        marketSurveys: action.payload.marketSurveys,
        allFactors: action.payload.allFactors,
      };
    }

    case 'CHANGE_CALCULATION_METHOD': {
      // clear state that related to use system calculation mode
      return {
        ...state,
        systemCalculationMode: action.payload.systemCalculationMethodType,
      };
    }

    /** Enter edit mode state:
     * - set viewMode to 'editing'
     */
    case 'EDIT_ENTER': {
      // const sorted = sortApproaches(state.editDraft) ?? null;
      const nextState: PriceAnalysisSelectorState = {
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

      const nextState: PriceAnalysisSelectorState = {
        ...state,
        editDraft: state.editDraft.map(appr => {
          /** if approach not matches the payload, return it */
          if (appr.approachType !== action.payload.approachType) return appr;
          /** if approach matches the payload, loop finds a matching method type */
          return {
            ...appr,
            /** either select or deselect, reset approach's appraisal value to 0 and reset candidate */
            appraisalValue: 0,
            isCandidated: false,
            methods: appr.methods.map(method => {
              /** if a method type not matches, return it */
              if (method.methodType !== action.payload.methodType) return method;

              /** if a method type is match and method is selected, flip the status to false */
              if (method.isSelected) return { ...method, appraisalValue: 0, isSelected: false };

              /** if a method type is match and method is not selected, flip status to true */
              return { ...method, appraisalValue: 0, isSelected: true };
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
      const nextState: PriceAnalysisSelectorState = {
        ...state,
        editDraft: cloneApproaches(state.editSaved),
        viewMode: 'summary',
      };
      return nextState;
    }

    /** Save editing changes in editing mode state:
     *
     */
    case 'EDIT_SAVE': {
      /**
       * control logic
       * if summary and editing are difference, warning
       * if summary and editing are difference, reset selected on approach and method in summary screen
       */

      if (state.editDraft == null) return state;

      /** compare changes between editDraft and editSaved */
      const changed = selectionKey(state.editDraft) !== selectionKey(state.editSaved);

      let visibleApproach = getVisibleApproach(state.editDraft);

      /** If changed, reset candidate appraisal value of approach by 0 */
      if (changed) {
        visibleApproach = visibleApproach.map(appr => ({
          ...appr,
          /** reset candidate and approach's appraisal value to 0  */
          appraisalValue: 0,
          isCandidated: false,
          methods: appr.methods.map(method => {
            return {
              ...method,
              isCandidated: false,
            };
          }),
        }));
      }

      /** update editSaved equal to editDraft and update summarySelected with visible approach */
      const nextState: PriceAnalysisSelectorState = {
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
      // const sortVisibleApproach = sortApproaches(visibleApproach);

      const nextState: PriceAnalysisSelectorState = {
        ...state,
        summarySelected: cloneApproaches(visibleApproach),
        viewMode: 'summary',
      };
      return nextState;
    }

    case 'SUMMARY_SELECT_METHOD': {
      if (state.summarySelected == null) return state;

      // every seleted method must have value system will allow user to select method
      if (
        state.summarySelected.some(appr => appr.methods.some(method => method.appraisalValue <= 0))
      )
        return state;

      // if any method has select, clear that method and enable selected one
      const nextState: PriceAnalysisSelectorState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => {
          if (appr.approachType !== action.payload.approachType) return appr;

          const candidatedMethod = checkMethodIsCandidated(appr.methods);
          if (action.payload.methodType === candidatedMethod) return appr;

          return {
            ...appr,
            appraisalValue:
              appr.methods.find(method => method.methodType === action.payload.methodType)
                ?.appraisalValue ?? 0,
            methods: appr.methods.map(method => ({
              ...method,
              isCandidated: method.methodType === action.payload.methodType,
            })),
          };
        }),
      };
      return nextState;
    }

    case 'SUMMARY_SELECT_APPROACH': {
      if (state.summarySelected == null) return state;

      // every approach must got selected method
      const allApproachHavecandidated = state.summarySelected.every(appr =>
        appr.methods.some(method => method.isCandidated),
      );

      if (!allApproachHavecandidated) return state;

      const candidatedApproach = checkApproachIsCandidated(state.summarySelected);
      if (action.payload.approachType === candidatedApproach) return state;

      const nextState: PriceAnalysisSelectorState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => ({
          ...appr,
          isCandidated: appr.approachType === action.payload.approachType,
        })),
      };
      return nextState;
    }

    case 'SUMMARY_SAVE': {
      return state;
    }

    case 'CALCULATION_SELECTED': {
      return {
        ...state,
        activeMethod: {
          approachId: action.payload.approachId,
          approachType: action.payload.approachType,
          methodId: action.payload.methodId,
          methodType: action.payload.methodType,
        },
      };
    }

    case 'CALCULATION_ENTER': {
      return {
        ...state,
        allFactors: action.payload.allFactors,
        methodTemplates: action.payload.templates,
      };
    }

    default:
      return state;
  }
}
