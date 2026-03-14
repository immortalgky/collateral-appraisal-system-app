import type { DCFMethodFormType } from '../schemas/dcfForm';
import { MethodProportion } from './dcfMethods/MethodProportion';

interface DiscountedCashFlowMethodRendererProps {
  editing: string | null;
  assumptionId: string;
  assumptionName: string;
  method: DCFMethodFormType;
  totalNumberOfYear: number;
  onCancelEditMode: () => void;
}
export function DiscountedCashFlowMethodRenderer({
  editing,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYear,
  onCancelEditMode,
}: DiscountedCashFlowMethodRendererProps) {
  switch (method.methodType) {
    case 'proportion':
      return (
        <MethodProportion
          totalNumberOfYears={totalNumberOfYear}
          editing={editing}
          method={method}
          assumptionId={assumptionId}
          assumptionName={assumptionName}
          onCancelEditMode={onCancelEditMode}
        />
      );
  }
}
