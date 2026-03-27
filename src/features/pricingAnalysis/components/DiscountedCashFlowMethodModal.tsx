import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import { assumptionParams, categoryParams, methodParams } from '../data/dcfParameters';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { DiscountedCashFlowModalRenderer } from './DiscountedCashFlowMethodModalRenderer';
import type { DCFMethod, DCFSection } from '../types/dcf';
import { buildDiscountedCashFlowCategoryOptions } from '../adapters/buildDiscountedCashFlowCategoryOptions';
import { mapDCFMethodCodeToSystemType } from '../domain/mapDCFMethodCodeToSystemType';

export interface AssumptionEditDraft {
  targetSectionClientId: string | null;
  targetCategoryClientId: string | null;
  targetAssumptionClientId: string | null;
  assumptionType: string | null;
  assumptionName: string | null;
  displayName: string | null;
  method: DCFMethod;
}

interface DiscountedCashFlowMethodModalProps {
  editing: string | null;
  initialData: AssumptionEditDraft;
  getOuterFormValues: (name: string) => object[];
  onCancelEditMode: () => void;
  onSaveEditMode: (data: AssumptionEditDraft) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}
export function DiscountedCashFlowMethodModal({
  editing,
  initialData,
  getOuterFormValues,
  onCancelEditMode,
  onSaveEditMode,
  size,
}: DiscountedCashFlowMethodModalProps) {
  const methods = useForm<AssumptionEditDraft>({
    defaultValues: initialData,
  });

  const { handleSubmit, reset, getValues, control } = methods;

  const methodType = useWatch({
    control,
    name: 'method.methodType',
  });

  const [systemMethodType, setSystemMethodType] = useState<string | null>(
    mapDCFMethodCodeToSystemType(methodType),
  );

  const prevMethodTypeRef = useRef<string | undefined>(undefined);
  const skipNextMethodResetRef = useRef(false);

  useEffect(() => {
    if (!editing) return;

    skipNextMethodResetRef.current = true;
    reset(initialData);
    prevMethodTypeRef.current = initialData.method?.methodType;
  }, [editing, initialData, reset]);

  useEffect(() => {
    if (skipNextMethodResetRef.current) {
      skipNextMethodResetRef.current = false;
      return;
    }

    if (prevMethodTypeRef.current === undefined) {
      prevMethodTypeRef.current = methodType;
      return;
    }

    if (prevMethodTypeRef.current !== methodType) {
      prevMethodTypeRef.current = methodType;

      console.log('method change!');

      reset({
        ...getValues(),
        method: {
          methodType: methodType ?? null,
          detail: undefined,
        },
      });

      setSystemMethodType(mapDCFMethodCodeToSystemType(methodType));
    }
  }, [methodType, reset, getValues]);

  const onSubmit = useCallback(
    (data: AssumptionEditDraft) => {
      console.log(data);
      onSaveEditMode(data);
      onCancelEditMode();
    },
    [onSaveEditMode, onCancelEditMode],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    },
    [handleSubmit, onSubmit],
  );

  const sections = (getOuterFormValues('sections') as DCFSection[]) ?? [];
  const currentSection = sections.find(
    section => section.clientId === initialData.targetSectionClientId,
  );

  const categoryOptions = buildDiscountedCashFlowCategoryOptions(currentSection?.categories ?? []);

  return (
    <Modal
      isOpen={!!editing}
      onClose={onCancelEditMode}
      title={`Edit Assumption: ${initialData.displayName}`}
      size={size ?? 'lg'}
    >
      <FormProvider {...methods}>
        <form
          onSubmit={e => {
            e.stopPropagation();
            handleSubmit(onSubmit)(e);
          }}
          onKeyDown={handleKeyDown}
        >
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex flex-row gap-1.5">
              <span className="w-44">Category</span>
              <RHFInputCell
                fieldName="targetCategoryClientId"
                inputType="select"
                options={categoryOptions}
              />
            </div>

            <div className="flex flex-row gap-1.5">
              <span className="w-44">Assumption</span>
              <RHFInputCell
                fieldName="assumptionType"
                inputType="select"
                options={assumptionParams.map(a => ({
                  value: a.code,
                  label: a.description,
                }))}
              />
            </div>

            <div className="flex flex-row gap-1.5">
              <span className="w-44">Method</span>
              <RHFInputCell
                fieldName="method.methodType"
                inputType="select"
                options={methodParams.map(m => ({
                  value: m.code,
                  label: m.description,
                }))}
              />
            </div>
          </div>

          <DiscountedCashFlowModalRenderer
            name="method.detail"
            methodType={systemMethodType}
            getOuterFormValues={getOuterFormValues}
            getInnerFormValues={getValues}
          />

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onCancelEditMode();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save
            </Button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
