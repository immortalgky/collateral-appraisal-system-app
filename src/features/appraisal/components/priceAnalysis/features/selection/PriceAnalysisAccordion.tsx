import { Icon } from '@/shared/components';
import clsx from 'clsx';
import React, { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  PriceAnalysisApproachMethodSelector,
  type Approach,
} from './PriceAnalysisApproachMethodSelector';
import {
  useAddPriceAnalysisApproachMethod,
  useGetPriceAnalysisApproachMethodByGroupId,
  useSelectPriceAnalysisApproachMethod,
} from '../../api/api';
import {
  approachMethodReducer,
  type PriceAnalysisSelectorAction,
  type PriceAnalysisSelectorState,
} from '../../domain/useReducer';
import type { PriceAnalysisApproachRequest } from './type';
import { usePriceAnalysisQuery } from '../../domain/usePriceAnalysisQuery';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { usePropertyStore } from '../../../../store';
import { PropertyCard } from '../../../PropertyCard';
import { DispatchCtx, StateCtx } from './selectionContext';

const createInitialState = (
  approachConfig: any,
  approachData: PriceAnalysisApproachRequest[],
): Approach[] => {
  const approaches = approachConfig?.map(appr => {
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

export type PriceAnalysisSelectorMode = 'editing' | 'summary';

interface PriceAnalysisAccordionProps {
  groupId: string;
  onSelectCalculationMethod: (methodId: string) => void;
}

export const PriceAnalysisAccordion = ({
  groupId,
  onSelectCalculationMethod,
}: PriceAnalysisAccordionProps) => {
  /* Server state: fetch property data by groupId && fetch approach and method by groupId */
  const { data, isLoading, isError, error } = usePriceAnalysisQuery();
  const approachesMoc = useGetPriceAnalysisApproachMethodByGroupId(groupId);

  const initialState: PriceAnalysisSelectorState = {
    viewMode: 'summary',
    editDraft: [],
    editSaved: [],
    summarySelected: [],
  };

  const [state, dispatch] = useReducer(approachMethodReducer, initialState);
  const { summarySelected } = state;

  // replace by fetch property data
  const { groups } = usePropertyStore();
  const group = groups.find(group => group.id === groupId) ?? null;
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    property: null,
    groupId: null,
  });

  useEffect(() => {
    if (isLoading) return;
    const approaches = createInitialState(data?.approaches, approachesMoc);

    dispatch({ type: 'INIT', payload: { approaches } });
    dispatch({ type: 'SUMMARY_ENTER' }); // TODO: check when these parameter, mode will switch to summary
  }, [data, isLoading, isError, error, approachesMoc]);

  /* Local state:  */
  const { isOpen: isPriceAnalysisAccordionOpen, onToggle: onPriceAnalysisAccordionChange } =
    useDisclosure({ defaultIsOpen: false });

  // fire api to save selected methods
  const { mutate: addPriceAnalysisMutate } = useAddPriceAnalysisApproachMethod();
  // fire api to save candidate approach & methods
  const { mutate: addCandidateApproachMutate } = useSelectPriceAnalysisApproachMethod();
  const [isSystemCalculation, setIsSystemCalculation] = useState<boolean>(true);
  const {
    isOpen: isConfirmDeselectedMethodOpen,
    onOpen: onConfirmDeselectedMethodOpen,
    onClose: onConfirmDeselectedMethodClose,
  } = useDisclosure();

  /**
   * control:
   * (1) clear data on system calculation changed
   */
  const handleOnSystemCalculationChange = () => {
    setIsSystemCalculation(!isSystemCalculation);
  };

  const handleOnEditModeSave = (
    data: PriceAnalysisApproachRequest,
    dispatch: React.Dispatch<PriceAnalysisSelectorAction>,
  ) => {
    // if some method has remove, need to fire api to update

    addPriceAnalysisMutate({ groupId: groupId, data: data }); // convert to PriceAnalysisApproachRequest
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

  const [pendingDeselect, setPendingDeselect] = useState<{
    approachId: string;
    methodId: string;
  } | null>(null);
  const handleOnSelectMethod = (approachId: string, methodId: string) => {
    const beforeChange =
      state.editDraft.find(appr => appr.id === approachId)?.methods.find(m => m.id === methodId)
        ?.appraisalValue ?? 0;

    if (beforeChange > 0) {
      setPendingDeselect({ approachId, methodId });
      onConfirmDeselectedMethodOpen();
      return;
    }
    dispatch({
      type: 'EDIT_TOGGLE_METHOD',
      payload: { apprId: approachId, methodId: methodId },
    });
  };

  const handleOnConfirmDeselectMethod = () => {
    dispatch({
      type: 'EDIT_TOGGLE_METHOD',
      payload: { apprId: pendingDeselect?.approachId, methodId: pendingDeselect?.methodId },
    });

    setPendingDeselect(null);
    onConfirmDeselectedMethodClose();
  };

  const handleOnCancelDeselectMethod = () => {
    setPendingDeselect(null);
    onConfirmDeselectedMethodClose();
  };

  const detailInnerRef = useRef<HTMLDivElement>(null);
  const [detailMaxHeight, setDetailMaxHeight] = useState(0);

  useLayoutEffect(() => {
    const el = detailInnerRef.current;
    if (!el) return;

    const measure = () => setDetailMaxHeight(el.scrollHeight);

    // measure once now (and after layout settles)
    const raf = requestAnimationFrame(measure);

    // keep it correct if content changes size (data loads, resizing panels, etc.)
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        <div className="rounded-xl border border-gray-200 bg-white px-2">
          {/* header */}
          <div className="grid grid-cols-12 justify-between items-center h-12">
            <div className="col-span-8">
              <span>{`${group?.name} (${group?.items.length} item(s))`}</span>
            </div>
            <div className="col-span-4 flex items-center justify-end gap-1">
              <div className="flex flex-row gap-1 items-center justify-end">
                <span>
                  {summarySelected
                    ? summarySelected.find(appr => appr.isCandidated)
                      ? Number(
                          summarySelected.find(appr => appr.isCandidated).appraisalValue,
                        ).toLocaleString()
                      : 0
                    : 0}
                </span>
                <Icon name="baht-sign" style="light" className="size-4" />
              </div>
              <button
                type="button"
                onClick={onPriceAnalysisAccordionChange}
                className="btn btn-ghost btn-sm"
                aria-expanded={isPriceAnalysisAccordionOpen}
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
            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{ maxHeight: isPriceAnalysisAccordionOpen ? detailMaxHeight : 0 }}
          >
            <div
              ref={detailInnerRef}
              className={clsx(
                'px-4 pb-4 text-gray-700 transition-opacity duration-200',
                isPriceAnalysisAccordionOpen
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none',
              )}
            >
              <Group className="flex-1 min-h-0 h-full gap-4">
                <Panel className="h-full min-h-0" minSize="20%" maxSize="40%">
                  {group && (
                    <SortableContext
                      items={group.items.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="h-full min-h-0 overflow-y-auto space-y-2">
                        {group.items.map(property => (
                          <PropertyCard
                            key={property.id}
                            property={property}
                            groupId={group.id}
                            onContextMenu={contextMenu}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  )}
                </Panel>

                <Separator>
                  <div className="flex items-center justify-center w-5 h-full hover:bg-gray-50 border-gray-200 flex-shrink-0 border-r">
                    <Icon name="grip-vertical" className="text-gray-400" />
                  </div>
                </Separator>

                <Panel className="h-full min-h-0">
                  <div className="h-full min-h-0">
                    <PriceAnalysisApproachMethodSelector
                      isSystemCalculation={isSystemCalculation}
                      onSystemCalculationChange={handleOnSystemCalculationChange}
                      onEditModeSave={handleOnEditModeSave}
                      onSummaryModeSave={handleOnSummaryModeSave}
                      onSelectMethod={handleOnSelectMethod}
                      onSelectCalculationMethod={onSelectCalculationMethod}
                    />
                  </div>
                </Panel>
              </Group>
            </div>
          </div>
        </div>
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
};
