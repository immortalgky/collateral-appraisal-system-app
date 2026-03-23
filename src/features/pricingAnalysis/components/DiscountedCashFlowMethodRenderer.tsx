import type { DCFMethodFormType } from '../schemas/dcfForm';
import { MethodProportion } from './dcfMethods/MethodProportion';
import { MethodSpecifyRoomIncomePerDay } from './dcfMethods/MethodSpecifyRoomIncomePerDay';

interface DiscountedCashFlowMethodRendererProps {
  name: string;
  editing: string | null;
  expanded: boolean;
  assumptionId?: string | null;
  assumptionName: string;
  method: DCFMethodFormType;
  totalNumberOfYear: number;
  onCancelEditMode: () => void;
}
export function DiscountedCashFlowMethodRenderer({
  name,
  editing,
  expanded,
  assumptionId,
  assumptionName,
  method,
  totalNumberOfYear,
  onCancelEditMode,
}: DiscountedCashFlowMethodRendererProps) {
  const props = {
    name: name,
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
    case 'specifyRoomInComeWithGrowthByOccupancyRate':
      return <></>;
    case 'proportion':
      return <MethodProportion {...props} />;
  }
}
