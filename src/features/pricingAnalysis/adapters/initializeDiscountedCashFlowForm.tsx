import type { UseFormReset } from 'react-hook-form';
import { getNewId } from '../domain/getNewId';
import type { DCFTemplateType } from '../types/dcf';
import type { DCFFormType } from '../schemas/dcfForm';

export function initializeDiscountedCashFlowForm(
  templateDetailQuery: DCFTemplateType,
  reset: UseFormReset<DCFFormType>,
) {
  reset({
    clientId: getNewId(),
    templateCode: templateDetailQuery.templateCode,
    templateName: templateDetailQuery.templateName,
    totalNumberOfYears: templateDetailQuery.totalNumberOfYears,
    totalNumberOfDayInYear: templateDetailQuery.totalNumberOfDayInYear,
    capitalizeRate: templateDetailQuery.capitalizeRate,
    discountedRate: templateDetailQuery.discountedRate,
    sections: templateDetailQuery.sections.map((s, s_idx) => {
      return {
        clientId: getNewId(),
        sectionType: s.sectionType,
        sectionName: s.sectionName,
        identifier: s.identifier,
        displaySeq: s_idx,
        categories:
          s.categories?.map((c, c_idx) => {
            return {
              clientId: getNewId(),
              categoryType: c.categoryType,
              categoryName: c.categoryName,
              identifier: c.identifier,
              displaySeq: c_idx,
              assumptions: c.assumptions.map((a, a_idx) => {
                return {
                  clientId: getNewId(),
                  assumptionType: a.assumptionType,
                  assumptionName: a.assumptionName,
                  identifier: a.identifier,
                  displaySeq: a_idx,
                  method: {
                    clientId: getNewId(),
                    methodType: a.method.methodType,
                    detail: a.method.detail,
                  },
                };
              }),
            };
          }) ?? null,
      };
    }),
    finalValue: 0,
    finalValueRounded: 0,
  });
}
