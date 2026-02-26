import toast from 'react-hot-toast';

import type { SelectionAction, SelectionState } from '../store/selectionReducer';
import type { Approach, Method } from '../types/selection';

type MethodKey = { approachType: string; methodType: string };

function findMethodByType(state: SelectionState, k: MethodKey) {
  const appr = state.summarySelected.find(
    (approach: Approach) => approach.approachType === k.approachType,
  );
  const method = appr?.methods.find((method: Method) => method.methodType === k.methodType);
  return { appr, method };
}

export function useCalculationFlow({
  state,
  dispatch,
}: {
  state: SelectionState;
  dispatch: React.Dispatch<SelectionAction>;
}) {
  const startCalculation = (k: MethodKey) => {
    const { appr, method } = findMethodByType(state, k);

    if (!method?.id || !appr?.id) {
      toast.error('Save selection first to generate method and approach IDs before calculation.');
      return;
    }

    dispatch({
      type: 'CALCULATION_SELECTED',
      payload: {
        pricingAnalysisId: state.pricingAnalysisId ?? '',
        approachId: appr.id,
        approachType: appr.approachType,
        methodId: method.id,
        methodType: method.methodType,
      },
    });
  };

  const cancelCalculationMethod = () => {
    dispatch({ type: 'CALCULATION_CANCEL' });
  };

  const onCalculationSave = (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => {
    dispatch({ type: 'CALCULATION_SAVE', payload });
  };

  const changeSystemCalculation = (method: boolean) => {
    dispatch({
      type: 'CHANGE_CALCULATION_METHOD',
      payload: { systemCalculationMethodType: method ? 'System' : 'FillIn' },
    });
  };

  return {
    startCalculation,
    cancelCalculationMethod,
    onCalculationSave,
    changeSystemCalculation,
  };
}
