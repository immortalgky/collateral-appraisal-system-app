import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import { useCallback, useEffect, useMemo } from 'react';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import {
  assumptionParams,
  mappingAssumptionMethodParams,
  methodParams,
} from '../../data/dcfParameters';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { DiscountedCashFlowModalRenderer } from './DiscountedCashFlowMethodModalRenderer';
import { type DCFMethod, type DCFSection } from '../../types/dcf';
import { getDCFFilteredAssumptions } from '../../domain/getDCFFilteredAssumptions';
import { mapDCFMethodCodeToSystemType } from '@features/pricingAnalysis/domain/dcf/mapDCFFMethodCodeToSystemType.ts';
import { Icon } from '@shared/components';
import { createDefaultMethod } from '@features/pricingAnalysis/domain/dcf/createEmptyMethodDetail.ts';

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
  properties: Record<string, unknown>[];
  getOuterFormValues: (name: string) => object[];
  onCancelEditMode: () => void;
  onSaveEditMode: (data: AssumptionEditDraft) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  isReadOnly: boolean;
}
export function DiscountedCashFlowMethodModal({
  editing,
  initialData,
  properties,
  getOuterFormValues,
  onCancelEditMode,
  onSaveEditMode,
  size,
  isReadOnly,
}: DiscountedCashFlowMethodModalProps) {
  const methods = useForm<AssumptionEditDraft>({
    defaultValues: initialData,
    shouldUnregister: true,
  });

  const { handleSubmit, reset, setValue, getValues, control } = methods;

  const methodType = useWatch({
    control,
    name: 'method.methodType',
  });

  const systemMethodType = useMemo(
    () => mapDCFMethodCodeToSystemType(methodType ?? null),
    [methodType],
  );

  const assumptionType = useWatch({
    control,
    name: 'assumptionType',
  });

  const handleMethodTypeChange = useCallback(
    (nextMethodType: string) => {
      const currentValues = getValues();
      const currentMethodId = currentValues.method?.id;

      reset({
        ...currentValues,
        method: createDefaultMethod(
          nextMethodType as AssumptionEditDraft['method']['methodType'],
          currentMethodId,
        ),
      });
    },
    [getValues, reset],
  );

  useEffect(() => {
    if (!editing) return;
    reset(initialData);
  }, [editing, initialData, reset]);

  const onSubmit = useCallback(
    (data: AssumptionEditDraft) => {
      onSaveEditMode(data);
      onCancelEditMode();
    },
    [onSaveEditMode, onCancelEditMode],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
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

  // const categoryOptions = buildDiscountedCashFlowCategoryOptions(currentSection?.categories ?? []);
  const assumptions = getDCFFilteredAssumptions(sections).map(a => a.assumption);

  const filteredAssumptionOptions = useMemo(() => {
    return assumptionParams
      .filter(
        p =>
          (!assumptions.some(
            a => a.assumptionType === p.code && a.assumptionType !== initialData.assumptionType,
          ) &&
            currentSection?.sectionType === p.sectionType) ||
          p.sectionType === 'any',
      )
      .map(a => ({ value: a.code, label: a.description }));
  }, [assumptionType, assumptions]);

  const filteredMethodOptions = useMemo(() => {
    if (!assumptionType) return [];

    const mapping = mappingAssumptionMethodParams.find(
      item => item.assumptionCode === assumptionType,
    );

    if (!mapping) return [];

    return methodParams
      .filter(method => mapping.methods.includes(method.code))
      .map(method => ({
        value: method.code,
        label: method.description,
      }));
  }, [assumptionType]);

  const handleAssumptionTypeChange = useCallback(
    (nextAssumptionType: string) => {
      const currentValues = getValues();

      reset({
        ...currentValues,
        assumptionType: nextAssumptionType,
        assumptionName: nextAssumptionType === 'M99' ? currentValues.assumptionName : null,
        method: {
          ...currentValues.method,
          methodType: null,
          detail: null,
        },
      });
    },
    [getValues, reset],
  );

  const handleOnClearMethod = () => {
    const currValues = getValues();
    const currentMethodType = currValues.method?.methodType;
    const currentMethodId = currValues.method?.id;

    if (!currentMethodType) return;

    reset({
      ...currValues,
      method: createDefaultMethod(currentMethodType, currentMethodId),
    });
  };

  return (
    <Modal
      isOpen={!!editing}
      onClose={onCancelEditMode}
      title={`Edit Assumption: ${initialData.displayName}`}
      size={size ?? 'xl'}
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
              <div className="w-80">
                {/* <RHFInputCell
                  fieldName="targetCategoryClientId"
                  inputType="select"
                  options={categoryOptions}
                /> */}
                <span className="text-sm">
                  {currentSection?.categories?.find(
                    c => c.clientId === getValues('targetCategoryClientId'),
                  )?.categoryName ?? ''}
                </span>
              </div>
            </div>

            <div className="flex flex-row items-center gap-1.5">
              <span className="w-44">Assumption</span>
              <div className="w-80">
                <RHFInputCell
                  fieldName="assumptionType"
                  inputType="select"
                  options={filteredAssumptionOptions}
                  onSelectChange={handleAssumptionTypeChange}
                  disabled={isReadOnly}
                />
              </div>
              {assumptionType === 'M99' && (
                <div className="flex">
                  <RHFInputCell fieldName="assumptionName" inputType="text" disabled={isReadOnly} />
                </div>
              )}
            </div>

            <div className="flex flex-row gap-1.5">
              <span className="w-44">Method</span>
              <div className="w-80">
                <RHFInputCell
                  fieldName="method.methodType"
                  inputType="select"
                  options={filteredMethodOptions}
                  onSelectChange={handleMethodTypeChange}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {systemMethodType && (
            <DiscountedCashFlowModalRenderer
              key={systemMethodType ?? 'none'}
              name="method.detail"
              methodType={systemMethodType}
              properties={properties}
              getOuterFormValues={getOuterFormValues}
              isReadOnly={isReadOnly}
            />
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onCancelEditMode();
                }}
              >
                Cancel
              </Button>

              {!isReadOnly && (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={handleOnClearMethod}
                  className="text-red-500 hover:text-red-600"
                >
                  <Icon name="arrow-rotate-left" style="solid" className="size-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
            {!isReadOnly && (
              <Button type="submit" variant="primary" size="sm">
                Save
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
