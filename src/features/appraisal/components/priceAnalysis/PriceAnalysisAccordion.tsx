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
} from './api';
import {
  approachMethodReducer,
  type PriceAnalysisSelectorAction,
  type PriceAnalysisSelectorState,
} from './useReducer';
import type { ApproachMethodLink, PriceAnalysisApproachRequest } from './type';

const createInitialState = (
  approachData: PriceAnalysisApproachRequest[],
  links: ApproachMethodLink[],
  approachParams: Record<string, string>[],
  approachIcons: Record<string, string>,
  methodParams: Record<string, string>[],
  methodIcons: Record<string, string>,
): Approach[] => {
  const approaches = links.map(link => ({
    id: link.apprId,
    label: approachParams.find(appr => appr.id === link.apprId)?.label ?? '',
    icon: approachIcons[link.apprId] ?? '',
    appraisalValue: approachData.find(appr => appr.id === link.apprId)?.appraisalValue ?? 0,
    isCandidated: false,
    methods: link.methodIds.map(methodId => ({
      id: methodId,
      label: methodParams.find(method => method.id === methodId)?.label ?? '',
      icon: methodIcons[methodId] ?? '',
      // if approachData could not match id, means that method not selected
      isSelected: approachData
        .find(appr => appr.id === link.apprId)
        ?.methods.find(method => method.id === methodId)
        ? true
        : false,
      isCandidated: false,
      appraisalValue:
        approachData
          .find(appr => appr.id === link.apprId)
          ?.methods.find(method => method.id === methodId)?.appraisalValue ?? 0,
    })),
  }));

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

  const approachesMoc = useGetPriceAnalysisApproachMethodByGroupId(groupId);
  const { approachParams, methodParams, approachMethodLinkedParams, approachIcons, methodIcons } =
    useGetApproachParams();

  const initialState: State = {
    viewMode: 'summary',
    editSelected: null,
    summarySelected: null,
  };

  const [state, dispatch] = useReducer(approachMethodReducer, initialState);

  useEffect(() => {
    if (!approachesMoc?.length) return;
    if (!approachMethodLinkedParams?.length) return;

    const approaches = createInitialState(
      approachesMoc,
      approachMethodLinkedParams,
      approachParams,
      approachIcons,
      methodParams,
      methodIcons,
    );

    dispatch({ type: 'INIT', payload: { approaches } });
  }, [
    approachesMoc,
    approachMethodLinkedParams,
    approachParams,
    approachIcons,
    methodParams,
    methodIcons,
  ]);

  // const [initialApproaches, setInitialApproaches] = useState<Approach[]>([]);

  /* Local state:  */
  // state to control 'show or collapse'
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isSystemCalculation, setIsSystemCalculation] = useState<boolean>(true);

  const handleOnOpen = () => {
    setIsOpen(!isOpen);
  };

  // state to control 'use system calculation'
  // 1. default value from request field 'bring appraisal book?'
  const handleOnSystemCalculationChange = () => {
    setIsSystemCalculation(!isSystemCalculation);
  };

  const { mutate } = useAddPriceAnalysisApproachMethod();
  const handleOnEditModeSave = (
    data: PriceAnalysisApproachRequest,
    dispatch: React.Dispatch<PriceAnalysisSelectorAction>,
  ) => {
    // mutate({ groupId: groupId, data: data }); // convert to PriceAnalysisApproachRequest
    console.log('press!');
    dispatch({ type: 'EDIT_SAVE' });
  };

  // state to collect approach & method which selected
  /**
   * select condition:
   * 1. every method must calculate
   * 2. one method must be select
   * 3. one approach must be select
   */

  // function to shape api form and fire api to save

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        <div className="border border-base-300 rounded-xl p-4">
          {/* header */}
          <div className="flex justify-between items-center ">
            <span>GroupId: {groupId}</span>
            <button type="button" onClick={handleOnOpen} className="btn btn-ghost btn-sm">
              <Icon
                name="chevron-down"
                style="solid"
                className={clsx(
                  'size-4 text-gray-400 transition-transform duration-300 ease-in-out',
                  isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0',
                )}
              />
            </button>
          </div>

          {/* detail */}
          <div
            className={clsx(
              'transition-all ease-in-out duration-300 overflow-hidden',
              isOpen ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0',
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
                />
              </Panel>
            </Group>
          </div>
        </div>
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
};
