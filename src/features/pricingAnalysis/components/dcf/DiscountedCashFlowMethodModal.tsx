import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import { useCallback, useEffect, useMemo } from 'react';
import { RHFInputCell } from '@features/pricingAnalysis/components/table/RHFInputCell.tsx';
import { methodParams } from '../../data/dcfParameters';
import { useGetPricingParameters } from '../../api';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { DiscountedCashFlowModalRenderer } from './DiscountedCashFlowMethodModalRenderer';
import type { DCFMethod, DCFSection } from '../../types/dcf';
import { createDefaultMethod } from '../../domain/dcf/createEmptyMethodDetail';
import { mapDCFMethodCodeToSystemType } from '../../domain/mapDCFMethodCodeToSystemType';
import { getDCFFilteredAssumptions } from '../../domain/getDCFFilteredAssumptions';

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
  isReadOnly?: boolean;
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
  });

  const { handleSubmit, reset, getValues, control, register, setValue } = methods;

  const { data: pricingParams } = useGetPricingParameters();
  const assumptionTypeCatalog = pricingParams?.assumptionTypes ?? [];
  const assumptionMethodMatrix = pricingParams?.assumptionMethodMatrix ?? [];

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

      const newMethod = createDefaultMethod(
        nextMethodType as AssumptionEditDraft['method']['methodType'],
      );
      reset({
        ...currentValues,
        method: newMethod,
      });
    },
    [getValues, reset],
  );

  // Reset form only when the edit target switches. initialData is recomputed on every
  // parent render (new object reference), so including it in the deps would wipe the
  // modal's in-flight state (e.g. after the user picks an assumption type).
  useEffect(() => {
    if (!editing) return;
    reset(initialData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, reset]);

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
  const assumptions = getDCFFilteredAssumptions(getOuterFormValues).map(a => a.assumption);

  const filteredAssumptionOptions = useMemo(() => {
    return assumptionTypeCatalog
      .filter(
        p =>
          !assumptions.some(
            a => a.assumptionType === p.code && a.assumptionType !== initialData.assumptionType,
          ) &&
          (currentSection?.sectionType === p.sectionType || p.sectionType === 'any'),
      )
      .map(a => ({ value: a.code, label: a.name }));
  }, [assumptionTypeCatalog, assumptions, currentSection?.sectionType, initialData.assumptionType]);

  const filteredMethodOptions = useMemo(() => {
    if (!assumptionType) return [];

    const mapping = assumptionMethodMatrix.find(item => item.assumptionType === assumptionType);

    if (!mapping) return [];

    return methodParams
      .filter(method => mapping.allowedMethodCodes.includes(method.code))
      .map(method => ({
        value: method.code,
        label: method.description,
      }));
  }, [assumptionType, assumptionMethodMatrix]);

  const handleAssumptionTypeChange = useCallback(
    (nextAssumptionType: string) => {
      setValue('assumptionType', nextAssumptionType, { shouldDirty: true });

      const resolvedName =
        nextAssumptionType === 'M99'
          ? getValues('assumptionName')
          : (assumptionTypeCatalog.find(p => p.code === nextAssumptionType)?.name ?? null);
      setValue('assumptionName', resolvedName, { shouldDirty: true });

      setValue(
        'method.methodType',
        null as unknown as AssumptionEditDraft['method']['methodType'],
        {
          shouldDirty: true,
        },
      );
      setValue('method.detail', undefined, { shouldDirty: true });
    },
    [setValue, getValues, assumptionTypeCatalog],
  );

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
              <span className="w-56">Category</span>
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
              <span className="w-56">Assumption</span>
              <div className="w-80">
                <RHFInputCell
                  fieldName="assumptionType"
                  inputType="select"
                  options={filteredAssumptionOptions}
                  onSelectChange={handleAssumptionTypeChange}
                />
              </div>
              {assumptionType === 'M99' ? (
                <div className="flex">
                  <RHFInputCell fieldName="assumptionName" inputType="text" />
                </div>
              ) : (
                // Keep assumptionName registered so reset() values survive handleSubmit
                // (useForm is shouldUnregister: true; unrendered fields are dropped).
                <input type="hidden" {...register('assumptionName')} />
              )}
            </div>

            <div className="flex flex-row gap-1.5">
              <span className="w-56">Method</span>
              <div className="w-80">
                <RHFInputCell
                  fieldName="method.methodType"
                  inputType="select"
                  options={filteredMethodOptions}
                  onSelectChange={handleMethodTypeChange}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onCancelEditMode();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isReadOnly}>
              Save
            </Button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
