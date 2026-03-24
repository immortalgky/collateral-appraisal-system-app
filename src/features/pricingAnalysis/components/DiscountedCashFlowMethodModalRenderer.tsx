import { useFormContext, useWatch } from 'react-hook-form';
import { MethodProportionModal } from './dcfMethods/MethodProportionModal';
import { MethodSpecifyRoomIncomePerDayModal } from './dcfMethods/MethodSpecifyRoomIncomePerDayModal';
import { DiscountedCashFlowMethodModal } from './DiscountedCashFlowMethodModal';
import type { DCFMethod } from '../types/dcf';
import { methodParams } from '../data/dcfParameters';
import { mapDCFMethodCodeToSystemType } from '../domain/mapDCFMethodCodeToSystemType';
import { useEffect } from 'react';

interface DiscountedCashFlowModalRendererProps {
  name: string;
  assumptionName: string;
  method: DCFMethod;
  editing: string;
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

  useEffect(() => {
    resetField(`${name}`, { defaultValue: { methodType: watchMethodType } });
  }, [watchMethodType]);

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
    case 'specifyRoomIncomePerDay': {
      return <MethodSpecifyRoomIncomePerDayModal name={`${name}.detail`} />;
    }
    case 'proportion': {
      return <MethodProportionModal name={`${name}.detail`} />;
    }
    default: {
      return <></>;
    }
  }
}
