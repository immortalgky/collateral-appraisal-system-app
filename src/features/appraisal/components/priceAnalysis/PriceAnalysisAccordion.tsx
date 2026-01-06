import { Icon } from '@/shared/components';
import clsx from 'clsx';
import { useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { PriceAnalysisApproachMethodSelector } from './PriceAnalysisApproachMethodSelector';

const approachParams = [
  { id: '01', value: 'Market Approach' },
  { id: '02', value: 'Cost Approach' },
  { id: '03', value: 'Income Approach' },
  { id: '04', value: 'Residual Approach' },
];

const methodParams = [
  { id: '01', value: 'Weighted Quality Score (WQS)' },
  { id: '02', value: 'Sales Adjustment Grid' },
  { id: '03', value: 'Direct Comparison' },
];

const approachMethodMoc = [
  { id: 'market', label: 'Market Approach', methods: ['WQS', 'Sales Adj', 'Direct Compare'] },
  { id: 'cost', label: 'Cost Approach' },
];

const approach = {
  id: '01',
  label: 'Market Approach',
  isEnable: false,
  isCandidate: false,
  methods: [{}],
};

const method = {
  id: '01',
  label: 'Weighted Quality Score (WQS)',
  value: 0,
  isEnable: false,
  isCandidate: false,
};

interface PriceAnalysisAccordionProps {
  groupId: string;
}

export const PriceAnalysisAccordion = ({ groupId }: PriceAnalysisAccordionProps) => {
  /* Server state: fetch property data by groupId */
  // system have to 

  /* Local state:  */
  // state to control 'show or collapse'
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [isSystemCalculation, setIsSystemCalculation] = useState<boolean>(true);
  const [isDetermineApproachMethod, setIsDetermineApproachMethod] = useState<boolean>(false);

  const handleOnCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // state to control 'use system calculation'
  // 1. default value from request field 'bring appraisal book?'
  const handleOnSystemCalculationChange = () => {
    setIsSystemCalculation(!isSystemCalculation);
  };

  // state to control 'determine approach and method'
  const handleOnDetermineApproachMethodChange = () => {
    setIsDetermineApproachMethod(!isDetermineApproachMethod);
  };

  const contentId = 'approach-method-content';

  return (
    <div className="border border-base-300 rounded-xl px-4 py-2">
      {/* header */}
      <div className="flex justify-between items-center ">
        <span>Group 1</span>
        <button
          type="button"
          onClick={handleOnCollapse}
          aria-expanded={isCollapsed}
          aria-controls={contentId}
          className="btn btn-ghost btn-sm"
        >
          <Icon
            name="chevron-down"
            style="solid"
            className={clsx(
              'size-4 text-gray-400 transition-transform duration-300 ease-in-out',
              isCollapsed ? 'rotate-180' : '',
            )}
          />
        </button>
      </div>

      {/* detail */}
      <div
        id={contentId}
        className={clsx(
          'transition-all duration-300 ease-in-out overflow-hidden',
          isCollapsed ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0',
        )}
      >
        {isCollapsed && (
          <Group className="flex gap-4 p-4">
            <Panel minSize="20%" maxSize="50%">
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
                isDetermineApproachMethod={isDetermineApproachMethod}
                onDetermineApproachMethodChange={handleOnDetermineApproachMethodChange}
              />
            </Panel>
          </Group>
        )}
      </div>
    </div>
  );
};
