import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import {
  PriceAnalysisApproachMethodSelector,
  type Approach,
} from './PriceAnalysisApproachMethodSelector';

// ==== Mock Data ====
/*
 * initialize approach and method choices
 * 1 api to fetch all approach and method choices
 */

const approachParams: Record<string, string>[] = [
  { id: '01', label: 'Market Approach' },
  { id: '02', label: 'Cost Approach' },
  { id: '03', label: 'Income Approach' },
  { id: '04', label: 'Residual Approach' },
];

const methodParams: Record<string, string>[] = [
  { id: '01', label: 'Weighted Quality Score (WQS)' },
  { id: '02', label: 'Sales Adjustment Grid' },
  { id: '03', label: 'Direct Comparison' },
];

const approachMethodLinkedParams: ApproachMethodLink[] = [
  { apprId: '01', methodIds: ['01', '02', '03'] },
  { apprId: '02', methodIds: ['01', '02', '03'] },
];

const approachIcons: Record<string, string> = {
  '01': 'shop',
  '02': 'triangle-person-digging',
};

const methodIcons: Record<string, string> = {
  '01': 'scale-balanced',
  '02': 'table',
  '03': 'house-building',
};

/*
 * initialize selected approach and method
 * 1 api to fetch selected approach and method by groupId
 * accually
 */

type ApproachMethodLink = {
  apprId: string;
  methodIds: string[]; // pick ONE naming and stick to it
};

const approachesMoc = [
  {
    id: '01',
    appraisalValue: 0,
    methods: [
      { id: '01', isCandidated: false, appraisalValue: 0 },
      { id: '02', isCandidated: false, appraisalValue: 0 },
    ],
  },
  {
    id: '02',
    appraisalValue: 0,
    methods: [{ id: '02', isCandidated: false, appraisalValue: 0 }],
  },
];

const mappingApproachMethodParams = (
  approachData: Approach[],
  links: ApproachMethodLink[],
  approachParams: Record<string, string>[],
  methodParams: Record<string, string>[],
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

interface PriceAnalysisAccordionProps {
  groupId: string;
}

export type PriceAnalysisSelectorMode = 'editing' | 'summary';

export const PriceAnalysisAccordion = ({ groupId }: PriceAnalysisAccordionProps) => {
  /* Server state: fetch property data by groupId */
  useEffect(() => {
    // fetch data
    setInitialApproaches(
      mappingApproachMethodParams(
        approachesMoc,
        approachMethodLinkedParams,
        approachParams,
        methodParams,
      ).sort((prev, curr) => prev.id.localeCompare(curr.id)),
    );
  }, []);
  const [initialApproaches, setInitialApproaches] = useState<Approach[]>([]);

  /* Local state:  */
  // state to control 'show or collapse'
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isSystemCalculation, setIsSystemCalculation] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<PriceAnalysisSelectorMode>('summary');

  const handleOnCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // state to control 'use system calculation'
  // 1. default value from request field 'bring appraisal book?'
  const handleOnSystemCalculationChange = () => {
    setIsSystemCalculation(!isSystemCalculation);
  };

  // state to control view mode on click 'determinde cost approach and metho' button
  const handleOnViewModeChange = () => {
    if (viewMode === 'editing') setViewMode('summary');
    else if (viewMode === 'summary') setViewMode('editing');
  };

  // state to set/ remove approach & method
  const handleOnMethodChange = (approach: any, method: any) => {
    // check is existed or not
    const appr = {
      id: approach.id,
      label: approach.label,
      icon: approach.icon,
      appraisalValue: approach.appraisalValue,
      isCandidated: approach.isCandidated,
      methods: [
        ...approach.methods.filter(m => m.id !== method.id),
        { ...method, isSelected: !method.isSelected },
      ].sort((prev, curr) => prev.id.localeCompare(curr.id)),
    };
    setInitialApproaches(
      [...initialApproaches.filter(appr => appr.id !== approach.id), appr].sort((prev, curr) =>
        prev.id.localeCompare(curr.id),
      ),
    );
  };

  // state to collect approach & method which selected to fire Api

  return (
    <div className="border border-base-300 rounded-xl p-4">
      {/* header */}
      <div className="flex justify-between items-center ">
        <span>GroupId: {groupId}</span>
        <button type="button" onClick={handleOnCollapse} className="btn btn-ghost btn-sm">
          <Icon
            name="chevron-down"
            style="solid"
            className={clsx(
              'size-4 text-gray-400 transition-transform duration-300 ease-in-out',
              !isCollapsed ? 'rotate-180' : '',
            )}
          />
        </button>
      </div>

      {/* detail */}
      <div
        className={clsx(
          'transition-all ease-in-out duration-300 overflow-hidden',
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100',
        )}
      >
        {!isCollapsed && (
          <Group className="flex gap-4 p-4">
            <Panel minSize="20%" maxSize="50%">
              left
            </Panel>
            <Separator>
              <div className="flex items-center justify-center w-5 h-full hover:bg-gray-50 border-gray-200 flex-shrink-0 border-r">
                <Icon name="grip-vertical" className="text-gray-400" />
              </div>
            </Separator>
            <Panel minSize="20%">
              <PriceAnalysisApproachMethodSelector
                isSystemCalculation={isSystemCalculation}
                onSystemCalculationChange={handleOnSystemCalculationChange}
                viewMode={viewMode}
                onViewModeChange={handleOnViewModeChange}
                approaches={initialApproaches}
                onApproachChange={handleOnMethodChange}
              />
            </Panel>
          </Group>
        )}
      </div>
    </div>
  );
};
