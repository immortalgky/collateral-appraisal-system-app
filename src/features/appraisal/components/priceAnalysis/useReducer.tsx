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

  editDraft: Approach[];
  editSaved: Approach[];

  summarySelected: Approach[];
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
  return approaches
    .filter(appr => appr.methods.some(method => method.isSelected))
    .map(appr => ({ ...appr, methods: appr.methods.filter(method => method.isSelected) }));
};

const selectionKey = (approaches: approach[]) => {
  return getVisibleApproach(approaches)
    .map(appr => {
      const methodIds = appr.methods
        .map(m => m.id)
        .sort()
        .join(',');
      return `${appr.id}:${methodIds}`;
    })
    .sort()
    .join('}');
};

const checkMethodIsCandidated = (methods: Method[]): string | null => {
  return methods.find(method => method.isCandidated)?.id ?? null;
};

const checkApproachIsCandidated = (approaches: Approach[]): string | null => {
  return approaches.find(appr => appr.isCandidated)?.id ?? null;
};

const sortApproaches = (approaches: Approach[]): Approach[] | null => {
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

const diffApproaches = (oldApproaches: Approach[], newApproaches: Approach[]) => {};

export const approachMethodReducer: React.Reducer<State, Action> = (
  state: PriceAnalysisSelectorState,
  action: PriceAnalysisSelectorAction,
) => {
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
      const nextState = {
        ...state,
        viewMode: 'editing',
      };
      return nextState;
    }

    case 'EDIT_TOGGLE_METHOD': {
      if (state.editDraft == null) return state;
      if (!state.editDraft.find(appr => appr.id === action.payload.apprId)) return state;

      /**
       * control logic
       * (1) if `summarySelected` has selected, warning
       */

      const nextState = {
        ...state,
        editDraft: state.editDraft.map(appr => {
          if (appr.id !== action.payload.apprId) return appr;
          return {
            ...appr,
            methods: appr.methods.map(method => {
              if (method.id !== action.payload.methodId) return method;
              if (method.isSelected) return { ...method, appraisalValue: 0, isSelected: false };
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
      const nextState = {
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

      const nextState = {
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

      const nextState = {
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
      if (state.summarySelected == null) return state;

      // every approach must got selected method
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
