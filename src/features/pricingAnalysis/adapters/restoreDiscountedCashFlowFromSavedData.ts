import type { DCF, DCFMethod } from '@features/pricingAnalysis/types/dcf.ts';
import type { DCFFormType } from '@features/pricingAnalysis/schemas/dcfForm.ts';
import type { UseFormReset } from 'react-hook-form';
import { getNewId } from '@features/pricingAnalysis/domain/getNewId.ts';

type DBToClientIdMap = Map<string, string>;
function buildDBIdMap(restoreData: DCF): DBToClientIdMap {
  const map = new Map<string, string>();

  for (const section of restoreData.sections ?? []) {
    if (section.dbId) {
      map.set(section.dbId, getNewId());
    }

    for (const category of section.categories ?? []) {
      if (category.dbId) {
        map.set(category.dbId, getNewId());
      }

      for (const assumption of category.assumptions ?? []) {
        if (assumption.dbId) {
          map.set(assumption.dbId, getNewId());
        }
      }
    }
  }

  return map;
}

function resolveClientId(dbIdMap: DBToClientIdMap, dbId?: string | null): string | null {
  if (!dbId) return null;
  return dbIdMap.get(dbId) ?? null;
}

function buildMethod(method: DCFMethod, dbIdMap: DBToClientIdMap): DCFMethod {
  if (method.methodType === '13') {
    return {
      clientId: getNewId(),
      methodType: '13',
      totalMethodValues: [0],
      detail: {
        proportionPct: method.detail?.proportionPct ?? 0,
        refTarget: {
          kind: method.detail?.refTarget?.kind ?? null,
          templateId: method.detail?.refTarget?.templateId ?? null,
          clientId: `${method.detail?.refTarget.kind}:${resolveClientId(dbIdMap, method.detail?.refTarget?.dbId)}`,
          dbId: method.detail?.refTarget.dbId ?? null,
        },
      },
    };
  }

  return {
    ...structuredClone(method),
    clientId: getNewId(),
    totalMethodValues: [0],
  };
}

function buildFormValues(data: DCF): DCFFormType {
  const dbIdMap = buildDBIdMap(data);

  return {
    clientId: getNewId(),
    templateCode: data.templateCode,
    templateName: data.templateName,
    totalNumberOfYears: data.totalNumberOfYears,
    totalNumberOfDayInYear: data.totalNumberOfDayInYear,
    capitalizeRate: data.capitalizeRate,
    discountedRate: data.discountedRate,

    sections: (data.sections ?? []).map((section, sIdx) => ({
      ...section,
      templateId: section.templateId,
      clientId: resolveClientId(dbIdMap, section.templateId) ?? getNewId(),
      dbId: section.dbId,
      displaySeq: sIdx,
      totalSectionValues: [0],

      categories: (section.categories ?? []).map((category, cIdx) => ({
        ...category,
        templateId: category.templateId,
        clientId: resolveClientId(dbIdMap, category.templateId) ?? getNewId(),
        dbId: category.dbId,
        displaySeq: cIdx,
        totalCategoryValues: [0],

        assumptions: (category.assumptions ?? []).map((assumption, aIdx) => ({
          ...assumption,
          templateId: assumption.templateId,
          clientId: resolveClientId(dbIdMap, assumption.templateId) ?? getNewId(),
          dbId: assumption.dbId,
          displaySeq: aIdx,
          totalAssumptionValues: [0],
          method: buildMethod(assumption.method, dbIdMap),
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

interface restoreDiscountedCashFlowFromSavedData {
  savedCalculation: DCF;
  reset: UseFormReset<DCFFormType>;
}
export function restoreDiscountedCashFlowFromSavedData({
  savedCalculation,
  reset,
}: restoreDiscountedCashFlowFromSavedData) {
  if (!savedCalculation) return;
  console.log(buildFormValues(savedCalculation));
  reset(buildFormValues(savedCalculation));
}
