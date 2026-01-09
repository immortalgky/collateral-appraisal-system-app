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
*/

interface Method {
  id: string;
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
  methods: Method[];
}

type ViewMode = 'editing' | 'summary';

export type PriceAnalysisSelectorState = {
  viewMode: ViewMode;

  editSelected: Approach[] | null;

  summarySelected: Approach[] | null;
};

export type PriceAnalysisSelectorAction =
  | { type: 'INIT'; payload: { approaches: Approach[] } }
  | { type: 'EDIT_ENTER' }
  | { type: 'EDIT_TOGGLE_METHOD'; payload: { apprId: string; methodId: string } }
  | { type: 'EDIT_CANCEL' }
  | { type: 'EDIT_SAVE' }
  | { type: 'SUMMARY_ENTER' }
  | { type: 'SUMMARY_SELECT_METHOD'; payload: { apprId: string; methodId: string } }
  | { type: 'SUMMARY_SELECT_APPROACH'; payload: { apprId: string } }
  | { type: 'SUMMARY_SAVE' };

const getVisibleApproach = (approaches: Approach[]) => {
  return approaches.filter(appr => appr.methods.some(method => method.isSelected));
};

const firstKey = () => {};

const checkMethodIsCandidated = (methods: Method[]): string | null => {
  return methods.find(method => method.isCandidated)?.id ?? null;
};

const checkApproachIsCandidated = (approaches: Approach[]): string | null => {
  return approaches.find(appr => appr.isCandidated)?.id ?? null;
};

const sortApproaches = (approaches: Approach[] | null): Approach[] | null => {
  if (!approaches) return null;

  return approaches
    .map(appr => ({
      ...appr,
      methods: [...appr.methods].sort((prev, curr) => prev.id.localeCompare(curr.id)), // clone then sort
    }))
    .sort((prev, curr) => prev.id.localeCompare(curr.id)); // sorting mapped array is fine
};

const cloneApproaches = (approaches: Approach[] | null): Approach[] | null => {
  return approaches
    ? approaches.map(appr => ({
        ...appr,
        methods: appr.methods.map(method => ({ ...method })),
      }))
    : null;
};

export const approachMethodReducer: React.Reducer<State, Action> = (
  state: PriceAnalysisSelectorState,
  action: PriceAnalysisSelectorAction,
) => {
  switch (action.type) {
    case 'INIT': {
      const sorted = sortApproaches(action.payload.approaches) ?? null;

      return {
        viewMode: 'summary',
        summarySelected: cloneApproaches(sorted),
        editSelected: cloneApproaches(sorted),
      };
    }

    case 'EDIT_ENTER': {
      /**
       * control logic
       *
       */
      const nextState = {
        ...state,
        editSelected: sortApproaches(state.editSelected),
        viewMode: 'editing',
      };
      return nextState;
    }

    case 'EDIT_TOGGLE_METHOD': {
      if (state.editSelected == null) return state;
      if (!state.editSelected.find(appr => appr.id === action.payload.apprId)) return state;

      /**
       * control logic
       * (1) if `summarySelected` has selected, warning
       */

      const nextState = {
        ...state,
        editSelected: state.editSelected.map(appr => {
          if (appr.id !== action.payload.apprId) return appr;
          return {
            ...appr,
            methods: appr.methods.map(method => {
              if (method.id !== action.payload.methodId) return method;
              return { ...method, isSelected: !method.isSelected };
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
      const nextState = {
        ...state,
        editSelected: cloneApproaches(state.summarySelected),
        viewMode: 'summary',
      };
      return nextState;
    }

    case 'EDIT_SAVE': {
      /**
       * control logic
       * if summary and editing is difference, warning
       */

      if (state.editSelected == null) return state;

      const visibleApproach = getVisibleApproach(state.editSelected);

      const nextState = {
        ...state,
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
      const sortVisibleApproach = sortApproaches(visibleApproach);

      const nextState = {
        ...state,
        summarySelected: cloneApproaches(sortVisibleApproach),
        viewMode: 'summary',
      };
      return nextState;
    }

    case 'SUMMARY_SELECT_METHOD': {
      /**
       * control logic
       * (1) every seleted method must have value system will allow user to select method
       */

      if (state.summarySelected == null) return state;

      /**
       * clear previous selected, change current selected
       */
      const nextState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => {
          if (appr.id !== action.payload.apprId) return appr;

          const candidatedMethod = checkMethodIsCandidated(appr.methods);
          if (action.payload.methodId === candidatedMethod) return appr;

          return {
            ...appr,
            appraisalValue:
              appr.methods.find(method => method.id === action.payload.methodId)?.appraisalValue ??
              0,
            methods: appr.methods.map(method => ({
              ...method,
              isCandidated: method.id === action.payload.methodId,
            })),
          };
        }),
      };
      return nextState;
    }

    case 'SUMMARY_SELECT_APPROACH': {
      /**
       * control logic
       * (1) method under the approach must be selected
       */

      if (state.summarySelected == null) return state;

      const allApproachHavecandidated = state.summarySelected.every(appr =>
        appr.methods.some(method => method.isCandidated),
      );

      if (!allApproachHavecandidated) return state;

      const candidatedApproach = checkApproachIsCandidated(state.summarySelected);
      if (action.payload.apprId === candidatedApproach) return state;

      const nextState = {
        ...state,
        summarySelected: state.summarySelected.map(appr => ({
          ...appr,
          isCandidated: appr.id === action.payload.apprId,
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
};
