import type { Approach, Method } from '../type';

/*
collect 2 separate object

interface Method {
  id: string;
  approachId: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isSelected: boolean;
  isCandidated: boolean;
}

interface Approach {
  id: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isCandidated: boolean;
}

// state to collect approach & method which selected
  select condition:
  1. every method must calculate
  2. one method must be select
  3. one approach must be select
*/
type ViewMode = 'editing' | 'summary';

export type PriceAnalysisSelectorState = {
  viewMode: ViewMode;

  editDraft: Approach[];
  editSaved: Approach[];

  summarySelected: Approach[];
};

export type PriceAnalysisSelectorAction =
  | { type: 'INIT'; payload: { approaches: Approach[] } }
  | { type: 'EDIT_ENTER' }
  | { type: 'EDIT_TOGGLE_METHOD'; payload: { approachType: string; methodType: string } }
  | { type: 'EDIT_CANCEL' }
  | { type: 'EDIT_SAVE' }
  | { type: 'SUMMARY_ENTER' }
  | { type: 'SUMMARY_SELECT_METHOD'; payload: { approachType: string; methodType: string } }
  | { type: 'SUMMARY_SELECT_APPROACH'; payload: { approachType: string } }
  | { type: 'SUMMARY_SAVE' };

const getVisibleApproach = (approaches: Approach[] = []) => {
  return approaches
    .filter(appr => appr.methods.some(method => method.isSelected))
    .map(appr => ({ ...appr, methods: appr.methods.filter(method => method.isSelected) }));
};

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
    case 'INIT': {
      // const sorted = sortApproaches(action.payload.approaches) ?? null;

      const approaches = action.payload.approaches;
      const visibleApproach = getVisibleApproach(action.payload.approaches);

      return {
        viewMode: 'summary',
        editSaved: cloneApproaches(approaches),
        editDraft: cloneApproaches(approaches),
        summarySelected: cloneApproaches(visibleApproach),
      };
    }

    case 'EDIT_ENTER': {
      /**
       * control logic
       *
       */
      // const sorted = sortApproaches(state.editDraft) ?? null;
      const nextState: PriceAnalysisSelectorState = {
        ...state,
        viewMode: 'editing',
      };
      return nextState;
    }

    case 'EDIT_TOGGLE_METHOD': {
      if (state.editDraft == null) return state;
      if (!state.editDraft.find(appr => appr.approachType === action.payload.approachType))
        return state;

      /**
       * control logic
       * (1) if `summarySelected` has selected, warning
       */

      const nextState: PriceAnalysisSelectorState = {
        ...state,
        editDraft: state.editDraft.map(appr => {
          /** if approach not match the payload return it */
          if (appr.approachType !== action.payload.approachType) return appr;
          /** if approach match the payload, loop find matching method type */
          return {
            ...appr,
            methods: appr.methods.map(method => {
              /** if method type not match, return it */
              if (method.methodType !== action.payload.methodType) return method;

              /** if method type is match and method is selected, flip status to false */
              if (method.isSelected) return { ...method, appraisalValue: 0, isSelected: false };

              /** if method type is match and method is not selected, flip status to true */
              return { ...method, appraisalValue: 0, isSelected: true };
            }),
          };
        }),
      };

      return nextState;
    }
    case 'EDIT_CANCEL': {
      /**
       * control logic
       * (1) warning if any method has changed
       */
      const nextState: PriceAnalysisSelectorState = {
        ...state,
        editDraft: cloneApproaches(state.editSaved),
        viewMode: 'summary',
      };
      return nextState;
    }

    case 'EDIT_SAVE': {
      /**
       * control logic
       * if summary and editing is difference, warning
       * if summary and editing is difference, reset selected on approach and method in summary screen
       */

      if (state.editDraft == null) return state;

      const changed = selectionKey(state.editDraft) !== selectionKey(state.editSaved);

      let visibleApproach = getVisibleApproach(state.editDraft);

      if (changed) {
        visibleApproach = visibleApproach.map(appr => ({
          ...appr,
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

      const nextState: PriceAnalysisSelectorState = {
        ...state,
        editSaved: cloneApproaches(state.editDraft),
        summarySelected: cloneApproaches(visibleApproach),
        viewMode: 'summary',
      };
      return nextState;
    }

    case 'SUMMARY_ENTER': {
      /**
       * control logic
       *
       */

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

    default:
      return state;
  }
}
