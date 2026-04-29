import type { UseFormReset } from 'react-hook-form';
import { getNewId } from '../domain/getNewId';
import type { DCFMethod, DCFTemplateType } from '../types/dcf';
import type { DCFFormType } from '../schemas/dcfForm';

type TemplateToClientIdMap = Map<string, string>;

function buildTemplateIdMap(template: DCFTemplateType): TemplateToClientIdMap {
  const map = new Map<string, string>();

  for (const section of template.sections ?? []) {
    if (section.templateId) {
      map.set(section.templateId, getNewId());
    }

    for (const category of section.categories ?? []) {
      if (category.templateId) {
        map.set(category.templateId, getNewId());
      }

      for (const assumption of category.assumptions ?? []) {
        if (assumption.templateId) {
          map.set(assumption.templateId, getNewId());
        }
      }
    }
  }

  return map;
}

function resolveClientId(
  templateIdMap: TemplateToClientIdMap,
  templateId?: string | null,
): string | null {
  if (!templateId) return null;
  return templateIdMap.get(templateId) ?? null;
}

function buildMethod(method: DCFMethod, templateIdMap: TemplateToClientIdMap): DCFMethod {
  if (method.methodType === '13') {
    const kind = method.detail?.refTarget?.kind ?? 'assumption';
    const templateId = method.detail?.refTarget?.templateId ?? null;
    const resolved = resolveClientId(templateIdMap, templateId);
    return {
      clientId: getNewId(),
      methodType: '13',
      totalMethodValues: [0],
      detail: {
        proportionPct: method.detail?.proportionPct ?? 0,
        refTarget: {
          kind,
          templateId,
          // Empty target picker label until user picks one — backend will reject save
          // if proportionPct > 0 with unresolved ref, but this lets template generation succeed.
          clientId: resolved ? `${kind}:${resolved}` : null,
          dbId: null,
        },
        startIn: method.detail?.startIn ?? 1,
      },
    };
  }

  return {
    ...structuredClone(method),
    clientId: getNewId(),
    totalMethodValues: [0],
  };
}

function buildDCFInitialValues(template: DCFTemplateType): DCFFormType {
  const templateIdMap = buildTemplateIdMap(template);

  return {
    clientId: getNewId(),
    templateCode: template.templateCode,
    templateName: template.templateName,
    totalNumberOfYears: template.totalNumberOfYears,
    totalNumberOfDayInYear: template.totalNumberOfDayInYear,
    capitalizeRate: template.capitalizeRate,
    discountedRate: template.discountedRate,

    sections: (template.sections ?? []).map((section, sIdx) => ({
      ...section,
      templateId: section.templateId,
      clientId: resolveClientId(templateIdMap, section.templateId) ?? getNewId(),
      displaySeq: sIdx,
      totalSectionValues: [0],

      categories: (section.categories ?? []).map((category, cIdx) => ({
        ...category,
        templateId: category.templateId,
        clientId: resolveClientId(templateIdMap, category.templateId) ?? getNewId(),
        displaySeq: cIdx,
        totalCategoryValues: [0],

        assumptions: (category.assumptions ?? []).map((assumption, aIdx) => ({
          ...assumption,
          templateId: assumption.templateId, // important: assumption templateId, not category templateId
          clientId: resolveClientId(templateIdMap, assumption.templateId) ?? getNewId(),
          displaySeq: aIdx,
          totalAssumptionValues: [0],
          method: buildMethod(assumption.method, templateIdMap),
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
  console.log(buildDCFInitialValues(templateDetailQuery));
  reset(buildDCFInitialValues(templateDetailQuery));
}
