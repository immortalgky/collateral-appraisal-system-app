import type {
  DCFAssumption,
  DCFCategory,
  DCFSection,
} from '../../types/dcf';
import { useFormContext, type UseFormGetValues, useWatch } from 'react-hook-form';
import Modal from '@/shared/components/Modal';
import { DiscountedCashFlowModalRenderer } from './DiscountedCashFlowMethodModalRenderer';
import { Button } from '@shared/components';
import { assumptionParams } from '../../data/dcfParameters';
import { mapDCFMethodCodeToSystemType } from '../../domain/mapDCFMethodCodeToSystemType';

interface DiscountedCashFlowSummaryAssumptionProps {
  properties: Record<string, unknown>[];
  getValues: UseFormGetValues<any>;
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
        <Button
          variant="ghost"
          type="button"
          onClick={onShowAssumptionSummary}
          className={'border border-gray-300 border-dashed cursor-pointer'}
        >
          View Assumption Summary
        </Button>
      </div>
      <Modal
        isOpen={showAssumptionSummary}
        onClose={onShowAssumptionSummary}
        title={`Assumption Summary`}
        size="3xl"
      >
        <div className={'overflow-auto max-h-[600px] flex flex-col gap-2'}>
          {(sections ?? []).map((section: DCFSection, sectionIdx: number) => {
            if (section.sectionType === 'income' || section.sectionType === 'expenses') {
              return (
                <div className={'flex flex-col gap-2'} key={section.clientId ?? sectionIdx}>
                  <span className={'p-1.5 text-2xl'}>Section: {section.sectionName}</span>
                  {(section.categories ?? []).map((category: DCFCategory, categoryIdx: number) => {
                    if (
                      category.categoryType === 'income' ||
                      category.categoryType === 'expenses' ||
                      category.categoryType === 'fixedExps'
                    ) {
                      return (
                        <div className={'p-1.5 gap-2 ml-8'} key={category.clientId ?? categoryIdx}>
                          <span className={'p-1.5 text-xl'}>Category: {category.categoryName}</span>
                          <div className={'flex flex-col gap-2'}>
                            {(category.assumptions ?? []).map(
                              (assumption: DCFAssumption, assumptionIdx: number) => {
                                const methodCode = assumption.method?.methodType ?? null;

                                const systemMethodType = methodCode
                                  ? mapDCFMethodCodeToSystemType(methodCode)
                                  : null;
                                if (!systemMethodType) return null;

                                const methodProps = {
                                  ...props,
                                  methodType: systemMethodType,
                                  name: `sections.${sectionIdx}.categories.${categoryIdx}.assumptions.${assumptionIdx}.method.detail`,
                                };
                                return (
                                  <div
                                    className={'flex flex-col gap-2 ml-8'}
                                    key={assumption.clientId ?? assumptionIdx}
                                  >
                                    <span className={'p-1.5 border-b border-gray-300'}>
                                      {assumption.assumptionName
                                        ? assumption.assumptionName
                                        : assumptionParams.find(
                                            (p: any) => p.code === assumption.assumptionType,
                                          )?.description}
                                    </span>
                                    <div className={'ml-4 p-2'}>
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
