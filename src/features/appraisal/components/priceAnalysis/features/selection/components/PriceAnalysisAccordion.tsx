import { Icon } from '@/shared/components';
import clsx from 'clsx';
import React, { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { PriceAnalysisApproachMethodSelector } from './PriceAnalysisApproachMethodSelector';

import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  useAddPriceAnalysisApproach,
  useAddPriceAnalysisMethod,
  useSelectPriceAnalysisApproachMethod,
} from '../api/api';
import { usePropertyStore } from '@/features/appraisal/store';
import type { PriceAnalysisApproachRequest } from '../type';
import { useSelectionDispatch, useSelectionState } from '../domain/selectionContext';
import { PropertyCard } from '@/features/appraisal/components/PropertyCard';
import { type PriceAnalysisSelectorAction } from '../domain/useReducer';
import { convertToAddApproachApi, convertToAddMethodApi } from '../domain/convertToApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

/**
 * Flow:
 * (1) no approach or method id
 * (2) [Editing mode] user choose approach and method under approach => save
 * (3) fire api to save data and return approach ids and method ids
 * (4) reload to [Summart mode] and query approach and method with ids
 * (5) ids will be assign to variables
 */

interface PriceAnalysisAccordionProps {
  groupId: string;
  onSelectCalculationMethod: (methodId: string, methodType: string) => void;
}

export const PriceAnalysisAccordion = ({
  groupId,
  onSelectCalculationMethod,
}: PriceAnalysisAccordionProps) => {
  const navigate = useNavigate();

  /** access reducer states */
  const { summarySelected, editDraft } = useSelectionState();
  const dispatch = useSelectionDispatch();

  /** left side panel, show collateral in the group */
  const { groups } = usePropertyStore();
  const group = groups.find(group => group.id === groupId) ?? null;
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    property: null,
    groupId: null,
  });

  /** Local state:  */

  /** state to control accordian disclosure */
  const { isOpen: isPriceAnalysisAccordionOpen, onToggle: onPriceAnalysisAccordionChange } =
    useDisclosure({ defaultIsOpen: true });

  /** api to save approach and method on editing mode */
  const {
    mutate: addPriceAnalysisApproachMutate,
    isPending: isAddingApproach,
    isSuccess: isAddApproachSuccess,
  } = useAddPriceAnalysisApproach();
  const {
    mutate: addPriceAnalysisMethodMutate,
    isPending: isAddingMethod,
    isSuccess: isAddMethodSuccess,
  } = useAddPriceAnalysisMethod();

  const isApiPending = isAddingApproach || isAddingMethod;
  const isApiSuccess = isAddApproachSuccess && isAddMethodSuccess;

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

  const handleOnEditModeSave = async (
    data: PriceAnalysisApproachRequest[],
    dispatch: React.Dispatch<PriceAnalysisSelectorAction>,
  ) => {
    // if some method has remove, need to fire api to update
    const selections =
      data
        ?.filter(d => d.methods.some(m => m.isSelected))
        .map(d => ({
          approachId: d.id,
          methodIds: d.methods.filter(m => m.isSelected).map(m => m.id),
        })) ?? [];
    try {
      for (const sel of selections) {
        const approachType = convertToAddApproachApi(sel.approachId);

        const approachRes = await addPriceAnalysisApproachMutate({
          id: '019C45EA-A220-72B6-A06E-BDDD15494E0A',
          request: { approachType },
        });

        await Promise.all(
          sel.methodIds.map(methodId => {
            const methodType = convertToAddMethodApi(methodId);
            return addPriceAnalysisMethodMutate({
              id: '019C45EA-A220-72B6-A06E-BDDD15494E0A',
              approachId: '00000000-0000-0000-0000-000000000000', // approachRes.id
              request: { methodType },
            });
          }),
        );
      }

      toast.success('Price analysis selection updated successfully');
      dispatch({ type: 'EDIT_SAVE' });
      navigate('/dev/price-analysis', {
        state: { groupId: 'D7AA433E-F36B-1410-8965-006F4F934FE1' },
      });
    } catch (err: any) {
      toast.error(
        err?.apiError?.detail || 'Failed to update price analysis selection. Please try again.',
      );
    }
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
    approachType: string;
    methodType: string;
  } | null>(null);

  /** handle  */
  const handleOnSelectMethod = (approachType: string, methodType: string) => {
    /** find method type that belongs to approach type in reducer's state */
    const appraisalValueBeforeChange =
      editDraft
        .find(appr => appr.approachType === approachType)
        ?.methods.find(m => m.methodType === methodType)?.appraisalValue ?? 0;

    /** if appraisal value of the method which being deselect got value, warning! */
    if (appraisalValueBeforeChange > 0) {
      setPendingDeselect({ approachType, methodType });
      onConfirmDeselectedMethodOpen();
      return;
    }

    /** call dispatch to toggle that method */
    dispatch({
      type: 'EDIT_TOGGLE_METHOD',
      payload: { approachType: approachType, methodType: methodType },
    });
  };

  const handleOnConfirmDeselectMethod = () => {
    dispatch({
      type: 'EDIT_TOGGLE_METHOD',
      payload: {
        approachType: pendingDeselect?.approachType ?? '',
        methodType: pendingDeselect?.methodType ?? '',
      },
    });

    setPendingDeselect(null);
    onConfirmDeselectedMethodClose();
  };

  const handleOnCancelDeselectMethod = () => {
    setPendingDeselect(null);
    onConfirmDeselectedMethodClose();
  };

  /** accordian effect */
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
      <ConfirmDialog
        isOpen={isConfirmDeselectedMethodOpen}
        onClose={handleOnCancelDeselectMethod}
        onConfirm={handleOnConfirmDeselectMethod}
        message={`Are you sure? If you confirm the appraisal value of this method will be removed.`}
      />
    </div>
  );
};
