import { Icon, Toggle } from '@/shared/components';
import type { PriceAnalysisSelectorMode } from './PriceAnalysisAccordion';
import { ApproachCard } from './ApproachCard';
import clsx from 'clsx';

export interface Method {
  id: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isSelected: boolean;
  isCandidated: boolean;
}

export interface Approach {
  id: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isCandidated: boolean; // if no method means not selected
  methods: Method[]; // selected methods from database
}

interface PriceAnalysisApproachMethodSelectorProps {
  isSystemCalculation: boolean;
  onSystemCalculationChange: () => void;

  viewMode: PriceAnalysisSelectorMode;
  onViewModeChange?: () => void;

  approaches: Approach[]; // selected approaches from database
  onApproachChange: (methodId: string) => void;
}

export const PriceAnalysisApproachMethodSelector = ({
  isSystemCalculation,
  onSystemCalculationChange,
  viewMode,
  onViewModeChange,
  approaches,
  onApproachChange,
}: PriceAnalysisApproachMethodSelectorProps) => {
  return (
    <div>
      <div className="flex flex-col gap-4">
        {/* System Calculation */}
        <div className="flex flex-row items-center gap-4 justify-center">
          <span>Use System Calculation: </span>
          <Toggle
            options={['No', 'Yes']}
            checked={isSystemCalculation}
            onChange={onSystemCalculationChange}
          ></Toggle>
        </div>

        {/* Determine Approach and Method */}
        <div>
          {viewMode === 'summary' && (
            <button
              type="button"
              className="flex justify-center items-center w-full p-2 border border-dashed border-gray-200 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={onViewModeChange}
            >
              Determine Approach and Method
            </button>
          )}
        </div>

        {/* Approach and Method Selection */}
        <div>
          {viewMode === 'editing' && (
            <div className="flex flex-col gap-4">
              {/* edit mode */}

              {/* Approach and methods */}
              <div className="h-48 overflow-y-auto">
                <div>
                  {approaches.map(appr => (
                    <div key={appr.id} className="flex flex-col gap-4 justify-center">
                      {/* approach */}
                      <div className="flex gap-4 justify-between items-center px-2">
                        <Icon
                          name={appr.icon}
                          style="solid"
                          className={clsx(
                            'size-4 transition-transform duration-300 ease-in-out',
                            // !isCollapsed ? 'rotate-180' : '',
                          )}
                        />
                        <span className="w-full">{appr.label}</span>
                        <button type="button" onClick={() => null} className="btn btn-ghost btn-sm">
                          <Icon
                            name="chevron-down"
                            style="solid"
                            className={clsx(
                              'size-4 text-gray-400 transition-transform duration-300 ease-in-out',
                              // !isCollapsed ? 'rotate-180' : '',
                            )}
                          />
                        </button>
                      </div>

                      {/* method */}
                      <div className="flex flex-col gap-2 ml-6 border-l border-base-300">
                        {appr.methods.map(method => (
                          <div key={method.id}>
                            <ApproachCard
                              mode={viewMode}
                              approach={appr}
                              method={method}
                              label={method.label}
                              icon={method.icon}
                              isSelected={method.isSelected}
                              onSelectedChange={onApproachChange}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200"></div>
              <div className="flex justify-between">
                <button type="button" className="btn btn-ghost" onClick={onViewModeChange}>
                  Cancel
                </button>
                <div className="flex gap-4">
                  <button type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
          {viewMode === 'summary' && <div> {/* summary mode */} Test</div>}
        </div>
      </div>
    </div>
  );
};
