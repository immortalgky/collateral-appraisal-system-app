import type { DCFMethodFormType } from '../schemas/dcfForm';
import { MethodProportion } from './dcfMethods/MethodProportion';
import { MethodSpecifyRoomIncomePerDay } from './dcfMethods/MethodSpecifyRoomIncomePerDay';

interface DiscountedCashFlowMethodRendererProps {
  editing: string | null;
  expanded: boolean;
  assumptionId: string;
  assumptionName: string;
  method: DCFMethodFormType;
  totalNumberOfYear: number;
  onCancelEditMode: () => void;
}
export function DiscountedCashFlowMethodRenderer({
  editing,
  expanded,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYear,
  onCancelEditMode,
}: DiscountedCashFlowMethodRendererProps) {
  const props = {
    editing: editing,
    expanded: expanded,
    totalNumberOfYears: totalNumberOfYear,
    method: method,
    assumptionId: assumptionId,
    assumptionName: assumptionName,
    onCancelEditMode: onCancelEditMode,
  };
  switch (method.methodType) {
    case 'specifyRoomIncomePerDay':
      return <MethodSpecifyRoomIncomePerDay {...props} />;
    case 'proportion':
      return <MethodProportion {...props} />;
  }
}
