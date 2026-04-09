import type { UseFormReset } from 'react-hook-form';
import { getNewId } from '../domain/getNewId';
import type { DCFTemplateType } from '../types/dcf';
import type { DCFFormType } from '../schemas/dcfForm';

function buildDCFInitialValues(templateDetailQuery: DCFTemplateType): DCFFormType {
  return {
    clientId: getNewId(),
    templateCode: templateDetailQuery.templateCode,
    templateName: templateDetailQuery.templateName,
    totalNumberOfYears: templateDetailQuery.totalNumberOfYears,
    totalNumberOfDayInYear: templateDetailQuery.totalNumberOfDayInYear,
    capitalizeRate: templateDetailQuery.capitalizeRate,
    discountedRate: templateDetailQuery.discountedRate,
    sections: (templateDetailQuery.sections ?? []).map((s, s_idx) => ({
      clientId: getNewId(),
      sectionType: s.sectionType,
      sectionName: s.sectionName,
      identifier: s.identifier,
      displaySeq: s_idx,
      totalSectionValues: [0],
      categories: (s.categories ?? []).map((c, c_idx) => ({
        clientId: getNewId(),
        categoryType: c.categoryType,
        categoryName: c.categoryName,
        identifier: c.identifier,
        displaySeq: c_idx,
        totalCategoryValues: [0],
        assumptions: (c.assumptions ?? []).map((a, a_idx) => ({
          clientId: getNewId(),
          assumptionType: a.assumptionType,
          assumptionName: a.assumptionName,
          identifier: a.identifier,
          displaySeq: a_idx,
          totalAssumptionValues: [0],
          method: {
            clientId: getNewId(),
            methodType: a.method.methodType,
            detail: structuredClone(a.method.detail),
            totalMethodValues: [0],
          },
        })),
      })),
    })),
    isHighestBestUsed: true,
    finalValue: 0,
    finalValueRounded: 0,
    appraisalPrice: 0,
    appraisalPriceRounded: 0,
  };
}

export function initializeDiscountedCashFlowForm(
  templateDetailQuery: DCFTemplateType,
  reset: UseFormReset<DCFFormType>,
) {
  reset(buildDCFInitialValues(templateDetailQuery));
}
