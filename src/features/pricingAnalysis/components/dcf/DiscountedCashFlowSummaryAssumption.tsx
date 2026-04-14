import type {
  DCFAssumption,
  DCFCategory,
  DCFSection,
} from '@features/pricingAnalysis/types/dcf.ts';
import { useFormContext, type UseFormGetValues, useWatch } from 'react-hook-form';
import type { FormValues } from '@features/appraisal/components/tables/bType.tsx';
import Modal from '@/shared/components/Modal';
import { DiscountedCashFlowModalRenderer } from '@features/pricingAnalysis/components/dcf/DiscountedCashFlowMethodModalRenderer.tsx';
import { Button } from '@shared/components';
import { assumptionParams } from '@features/pricingAnalysis/data/dcfParameters.ts';
import { mapDCFMethodCodeToSystemType } from '@features/pricingAnalysis/domain/dcf/mapDCFFMethodCodeToSystemType.ts';

interface DiscountedCashFlowSummaryAssumptionProps {
  properties: Record<string, unknown>[];
  getValues: UseFormGetValues<FormValues>;
  isReadOnly: boolean;
  showAssumptionSummary: boolean;
  onShowAssumptionSummary: () => void;
}
export function DiscountedCashFlowSummaryAssumption({
  properties,
  getValues,
  showAssumptionSummary,
  onShowAssumptionSummary,
}: DiscountedCashFlowSummaryAssumptionProps) {
  const { control } = useFormContext();
  const sections = useWatch({ name: 'sections', control });
  const props = { properties, getOuterFormValues: getValues, isReadOnly: true };

  return (
    <>
      <div className={'flex justify-end items-center'}>
        <div className={'w-72 p-1.5'}>
          <Button
            variant="ghost"
            type="button"
            onClick={onShowAssumptionSummary}
            className={'border border-gray-300 border-dashed cursor-pointer'}
          >
            View Assumption Summary
          </Button>
        </div>
      </div>
      <Modal
        isOpen={showAssumptionSummary}
        onClose={onShowAssumptionSummary}
        title={`Assumption Summary`}
        size="3xl"
      >
        <div className={'overflow-auto max-h-[800px]'}>
          {(sections ?? []).map((section: DCFSection, sectionIdx) => {
            if (section.sectionType === 'income' || section.sectionType === 'expenses') {
              return (
                <div className={'flex flex-col gap-2'} key={section.clientId ?? sectionIdx}>
                  <span>{section.sectionName}</span>
                  {(section.categories ?? []).map((category: DCFCategory, categoryIdx) => {
                    if (
                      category.categoryType === 'income' ||
                      category.categoryType === 'expenses' ||
                      category.categoryType === 'fixedExps'
                    ) {
                      return (
                        <div
                          className={'flex flex-col gap-1.5 ml-4'}
                          key={category.clientId ?? categoryIdx}
                        >
                          <span>{category.categoryName}</span>
                          <div className={'flex flex-col gap-1.5'}>
                            {(category.assumptions ?? []).map(
                              (assumption: DCFAssumption, assumptionIdx) => {
                                const methodProps = {
                                  ...props,
                                  methodType: mapDCFMethodCodeToSystemType(
                                    assumption.method.methodType,
                                  ),
                                  name: `sections.${sectionIdx}.categories.${categoryIdx}.assumptions.${assumptionIdx}.method.detail`,
                                };
                                return (
                                  <div
                                    className={'flex flex-col gap-1.5 ml-2'}
                                    key={assumption.clientId ?? assumptionIdx}
                                  >
                                    <span>
                                      {assumption.assumptionName
                                        ? assumption.assumptionName
                                        : assumptionParams.find(
                                            p => p.code === assumption.assumptionType,
                                          )?.description}
                                    </span>
                                    <div className={'mt-2 p-2 border-b border-gray-300'}>
                                      <DiscountedCashFlowModalRenderer {...methodProps} />
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              );
            }
          })}
        </div>
      </Modal>
    </>
  );
}
