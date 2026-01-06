import { Toggle } from '@/shared/components';

interface PriceAnalysisApproachMethodSelectorProps {
  isSystemCalculation: boolean;
  onSystemCalculationChange: () => void;
  isDetermineApproachMethod?: boolean;
  onDetermineApproachMethodChange?: () => void;
}

export const PriceAnalysisApproachMethodSelector = ({
  isSystemCalculation,
  onSystemCalculationChange,
  isDetermineApproachMethod,
  onDetermineApproachMethodChange,
}: PriceAnalysisApproachMethodSelectorProps) => {
  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center gap-4 justify-center">
          <span>Use System Calculation: </span>
          <Toggle
            options={['No', 'Yes']}
            checked={isSystemCalculation}
            onChange={onSystemCalculationChange}
          ></Toggle>
        </div>
        <div>
          {!isDetermineApproachMethod && (
            <button
              type="button"
              className="flex justify-center items-center w-full p-2 border border-dashed border-gray-200 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={onDetermineApproachMethodChange}
            >
              Determine Approach and Method
            </button>
          )}
        </div>
        {isDetermineApproachMethod && (
          <div className="flex flex-col gap-4">
            {/* Approach and methods */}

            {/* Footer Actions */}
            <div className="border-t border-gray-200"></div>
            <div className="flex justify-between">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onDetermineApproachMethodChange}
              >
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
      </div>
    </div>
  );
};
