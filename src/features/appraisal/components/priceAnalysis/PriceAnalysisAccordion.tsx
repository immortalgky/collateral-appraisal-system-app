import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  PriceAnalysisApproachMethodSelector,
  type Approach,
} from './PriceAnalysisApproachMethodSelector';
import {
  useAddPriceAnalysisApproachMethod,
  useGetApproachParams,
  useGetPriceAnalysisApproachMethodByGroupId,
  useSelectPriceAnalysisApproachMethod,
} from './api';
import {
  approachMethodReducer,
  type PriceAnalysisSelectorAction,
  type PriceAnalysisSelectorState,
} from './useReducer';
import type { ApproachMethodLink, PriceAnalysisApproachRequest } from './type';
import { usePriceAnalysisQuery } from './usePriceAnalysisQuery';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

const createInitialState = (
  approachConfig: any,
  approachData: PriceAnalysisApproachRequest[],
): Approach[] => {
  const approaches = approachConfig.map(appr => {
    const apprData = approachData.find(data => data.id === appr.id);
    return {
      id: appr.id,
      label: appr.label,
      icon: appr.icon,
      appraisalValue: apprData ? apprData.appraisalValue : 0,
      isCandidated: apprData && (apprData.isCandidated ? true : false),
      methods: appr.methods.map(method => {
        return {
          id: method.id,
          label: method.label,
          icon: method.icon,
          // if approachData could not match id, means that method not selected
          isSelected:
            apprData && (apprData.methods.find(data => data.id === method.id) ? true : false),
          isCandidated:
            apprData && apprData.methods.find(data => data.id === method.id)?.isCandidated,
          appraisalValue: apprData
            ? (apprData.methods.find(data => data.id === method.id)?.appraisalValue ?? 0)
            : method.appraisalValue,
        };
      }),
    };
  });

  return approaches;
};

const StateCtx = createContext<PriceAnalysisSelectorState | null>(null);
const DispatchCtx = createContext<React.Dispatch<PriceAnalysisSelectorAction> | null>(null);

export function useSelectionState() {
  const v = useContext(StateCtx);
  if (!v) throw new Error('useSelectionState must be used within SelectionProvider');
  return v;
}

export function useSelectionDispatch() {
  const v = useContext(DispatchCtx);
  if (!v) throw new Error('useSelectionDispatch must be used within SelectionProvider');
  return v;
}

export type PriceAnalysisSelectorMode = 'editing' | 'summary';

interface PriceAnalysisAccordionProps {
  groupId: string;
}

export const PriceAnalysisAccordion = ({ groupId }: PriceAnalysisAccordionProps) => {
  /* Server state: fetch property data by groupId */
  const { data, isLoading, isError, error } = usePriceAnalysisQuery();
  const approachesMoc = useGetPriceAnalysisApproachMethodByGroupId(groupId);

  const initialState: PriceAnalysisSelectorState = {
    viewMode: 'summary',
    editSelected: null,
    summarySelected: null,
  };

  const [state, dispatch] = useReducer(approachMethodReducer, initialState);
  const { summarySelected } = state;

  useEffect(() => {
    if (isLoading) return;

    if (!approachesMoc?.length) return;

    const approaches = createInitialState(data?.approaches, approachesMoc);
    console.log(approaches);

    dispatch({ type: 'INIT', payload: { approaches } });
    dispatch({ type: 'SUMMARY_ENTER' }); // TODO: check when these parameter, mode will switch to summary
  }, [data, isLoading, isError, error, approachesMoc]);

  /* Local state:  */
  // state to control 'show or collapse'
  const { isOpen: isPriceAnalysisAccordionOpen, onToggle: onPriceAnalysisAccordionChange } =
    useDisclosure();

  const { mutate: addPriceAnalysisMutate } = useAddPriceAnalysisApproachMethod();
  const { mutate: addCandidateApproachMutate } = useSelectPriceAnalysisApproachMethod();
  const [isSystemCalculation, setIsSystemCalculation] = useState<boolean>(true);
  const {
    isOpen: isConfirmDeselectedMethodOpen,
    onOpen: onConfirmDeselectedMethodOpen,
    onClose: onConfirmDeselectedMethodClose,
  } = useDisclosure();
  const {
    isOpen: isPriceAnalysisSelectorAccordionOpen,
    onToggle: onPriceAnalysisSelectorAccordionChange,
  } = useDisclosure();

  // state to control 'use system calculation'
  // 1. default value from request field 'bring appraisal book?'
  const handleOnSystemCalculationChange = () => {
    setIsSystemCalculation(!isSystemCalculation);
  };

  const handleOnEditModeSave = (
    data: PriceAnalysisApproachRequest,
    dispatch: React.Dispatch<PriceAnalysisSelectorAction>,
  ) => {
    addPriceAnalysisMutate(groupId, data); // convert to PriceAnalysisApproachRequest
    console.log(
      'POST /appraisal/price-analysis/ { approaches: [ {approach: {methods: [...method] } ] }',
    );
    dispatch({ type: 'EDIT_SAVE' });
  };

  const handleOnSummaryModeSave = (
    data: PriceAnalysisApproachRequest,
    dispatch: React.Dispatch<PriceAnalysisSelectorAction>,
  ) => {
    console.log(
      'POST /appraisal/price-analysis/ { approaches: [ {approach: {methods: [...method] } ] }',
      data,
    );
    // addCandidateApproachMutate({ groupId: groupId, data: data }); // convert to PriceAnalysisApproachRequest
    console.log(data);
    dispatch({ type: 'SUMMARY_SAVE' });
  };

  const handleOnSelectMethod = (approachId: string, methodId: string) => {
    const beforeChange =
      state.editDraft.find(appr => appr.id === approachId)?.methods.find(m => m.id === methodId)
        ?.appraisalValue ?? 0;
    if (beforeChange > 0) {
      onOpen();
      return;
    }
    dispatch({
      type: 'EDIT_TOGGLE_METHOD',
      payload: { apprId: approachId, methodId: methodId },
    });
  };

  const handleOnConfirmMethod = (approachId: string, methodId: string) => {
    dispatch({
      type: 'EDIT_TOGGLE_METHOD',
      payload: { apprId: approachId, methodId: methodId },
    });
    onClose();
  };

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        <div className="border border-base-300 rounded-xl p-4 h-full">
          {/* header */}
          <div className="grid grid-cols-12 justify-between items-center ">
            <div className="col-span-2">
              <span>GroupId: {groupId}</span>
            </div>
            <div className="col-span-8 flex flex-row gap-1 items-center justify-end">
              <span>
                {summarySelected
                  ? (Number(
                      summarySelected.find(appr => appr.isCandidated)?.appraisalValue,
                    ).toLocaleString() ?? 0)
                  : 0}
              </span>
              <Icon name="baht-sign" style="light" className="size-4" />
            </div>
            <div className="col-span-1 flex items-center justify-end">
              <button
                type="button"
                onClick={onPriceAnalysisAccordionChange}
                className="btn btn-ghost btn-sm"
              >
                <Icon
                  name="chevron-down"
                  style="solid"
                  className={clsx(
                    'size-4 text-gray-400 transition-transform duration-300 ease-in-out',
                    isPriceAnalysisAccordionOpen ? 'rotate-180' : 'rotate-0',
                  )}
                />
              </button>
            </div>
          </div>

          {/* detail */}
          <div
            className={clsx(
              'transition-all ease-in-out duration-300 overflow-hidden',
              isPriceAnalysisAccordionOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0',
            )}
          >
            <Group className="flex gap-4">
              <Panel minSize="20%" maxSize="40%">
                left
              </Panel>
              <Separator>
                <div className="flex items-center justify-center w-5 h-full hover:bg-gray-50 border-gray-200 flex-shrink-0 border-r">
                  <Icon name="grip-vertical" className="text-gray-400" />
                </div>
              </Separator>
              <Panel>
                <PriceAnalysisApproachMethodSelector
                  isSystemCalculation={isSystemCalculation}
                  onSystemCalculationChange={handleOnSystemCalculationChange}
                  onEditModeSave={handleOnEditModeSave}
                  onSummaryModeSave={handleOnSummaryModeSave}
                  isConfirmSelectedMethodOpen={}
                  onSelectedMethod={}
                  onDeSelectMethod={}
                />
              </Panel>
            </Group>
          </div>
        </div>
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
};
