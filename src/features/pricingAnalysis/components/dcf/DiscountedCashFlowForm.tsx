import type { DCFFormType } from '../../schemas/dcfForm';
import { DiscountedCashFlowTable } from './DiscountedCashFlowTable';

interface DiscountedCashFlowFormProps {
  data: DCFFormType;
  properties: Record<string, unknown>[] | undefined;
}

export function DiscountedCashFlowForm({ data }: DiscountedCashFlowFormProps) {
  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      <div
        id="form-scroll-container"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden gap-4 py-4"
      >
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4 pt-2">
              <h3 className="text-base font-semibold text-gray-800">
                Calculation of Appraisal Value
              </h3>
            </div>
            <div className="px-4">
              <DiscountedCashFlowTable
                totalNumberOfYears={data.totalNumberOfYears}
                properties={properties}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4 pt-2">
              <h3 className="text-base font-semibold text-gray-800">Adjust Final Value</h3>
            </div>
            <div className="px-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
