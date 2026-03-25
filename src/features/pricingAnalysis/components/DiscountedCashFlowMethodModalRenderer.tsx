import { useFormContext, useWatch } from 'react-hook-form';
import { MethodProportionModal } from './dcfMethods/MethodProportionModal';
import { MethodSpecifyRoomIncomePerDayModal } from './dcfMethods/MethodSpecifiedRoomIncomePerDayModal';
import { DiscountedCashFlowMethodModal } from './DiscountedCashFlowMethodModal';
import type { DCFMethod } from '../types/dcf';
import { methodParams } from '../data/dcfParameters';
import { mapDCFMethodCodeToSystemType } from '../domain/mapDCFMethodCodeToSystemType';
import { useEffect, useMemo, useRef } from 'react';
import { MethodSpecifiedValueWithGrowthModal } from './dcfMethods/MethodSpecifiedValueWithGrowthModal';

interface DiscountedCashFlowModalRendererProps {
  name: string;
  assumptionName: string;
  method: DCFMethod;
  editing: string | null;
  onCancelEditMode: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}
export function DiscountedCashFlowModalRenderer({
  name,
  assumptionName,
  method,
  editing,
  onCancelEditMode,
  size = '2xl',
}: DiscountedCashFlowModalRendererProps) {
  const { resetField } = useFormContext();
  const watchMethodType = useWatch({ name: `${name}.methodType` });
  const methodType = mapDCFMethodCodeToSystemType(watchMethodType);

  const prevMethodTypeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Skip the initial mount
    if (prevMethodTypeRef.current === undefined) {
      prevMethodTypeRef.current = watchMethodType;
      return;
    }

    // Only reset if methodType actually changed
    if (prevMethodTypeRef.current !== watchMethodType) {
      prevMethodTypeRef.current = watchMethodType;
      resetField(`${name}`, { defaultValue: { methodType: watchMethodType } });
    }
  }, [watchMethodType, name, resetField]);
  if (editing !== name) return;

  return (
    <DiscountedCashFlowMethodModal
      name={name}
      editing={editing}
      onCancelEditMode={onCancelEditMode}
      assumptionName={assumptionName}
      size={size}
    >
      {!!methodType && getMethodModal(methodType, name)}
    </DiscountedCashFlowMethodModal>
  );
}

function getMethodModal(methodType: string, name: string) {
  switch (methodType) {
    case 'specifiedRoomIncomePerDay': {
      return <MethodSpecifyRoomIncomePerDayModal name={`${name}.detail`} />;
    }
    case 'specifiedRoomIncomeBySeasonalRates':
      return <></>;
    case 'specifiedRoomIncomewithGrowth':
      return <></>;
    case 'specifiedRoomIncomewithGrowthbyOccupancyRate':
      return <></>;
    case 'specifiedRentalIncomePerMonth':
      return <></>;
    case 'specifiedRentalIncomePerSquareMeter':
      return <></>;
    case 'roomCostBasedOnExpensesPerRoomPerDay':
      return <></>;
    case 'specifiedFoodAndBeverageExpensesPerRoomPerDay':
      return <></>;
    case 'positionBasedSalaryCalculation':
      return <></>;
    case 'parameterBasedOnTierOfPropertyValue':
      return <></>;
    case 'specifiedEnergyCostIndex':
      return <></>;
    case 'proportionOfTheNewReplacementCost':
      return <></>;
    case 'proportion': {
      return <MethodProportionModal name={`${name}.detail`} />;
    }
    case 'specifiedValueWithGrowth':
      return <MethodSpecifiedValueWithGrowthModal name={`${name}.detail`} />;
    case 'grossOperatingProfit':
      return <></>;
    default: {
      return <></>;
    }
  }
}
