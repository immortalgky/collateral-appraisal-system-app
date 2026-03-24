import { useWatch } from 'react-hook-form';
import type { DCFMethodFormType } from '../schemas/dcfForm';
import type { DCFMethod } from '../types/dcf';
import { MethodProportion } from './dcfMethods/MethodProportion';
import { MethodSpecifyRoomIncomePerDay } from './dcfMethods/MethodSpecifyRoomIncomePerDay';
import { mapDCFMethodCodeToSystemType } from '../domain/mapDCFMethodCodeToSystemType';

interface DiscountedCashFlowMethodRendererProps {
  name: string;
  editing: string | null;
  expanded: boolean;
  assumptionId?: string | null;
  assumptionName: string;
  method: DCFMethod;
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

  const watchMethodType = useWatch({ name: `${name}.methodType` });
  const methodType = mapDCFMethodCodeToSystemType(watchMethodType);

  switch (methodType) {
    case 'specifyRoomIncomePerDay':
      return <MethodSpecifyRoomIncomePerDay {...props} />;
    case 'specifyRoomInComeWithGrowthByOccupancyRate':
      return <></>;
    case 'proportion':
      return <MethodProportion {...props} />;
    default:
      return <></>;
  }
}
