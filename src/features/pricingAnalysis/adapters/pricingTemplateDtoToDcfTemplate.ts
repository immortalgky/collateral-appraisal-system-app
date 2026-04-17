import type { PricingTemplateDto } from '../types/income';
import type { DCFTemplateType } from '../types/dcf';

// initializeDiscountedCashFlowForm reads `templateId` on every node to build its
// clientId map, but DCFTemplateType's inline shapes don't declare it — single
// boundary cast at return keeps the runtime contract while the type stays narrow.
export function pricingTemplateDtoToDcfTemplate(dto: PricingTemplateDto): DCFTemplateType {
  return {
    id: dto.id,
    templateCode: dto.code,
    templateName: dto.name,
    totalNumberOfYears: dto.totalNumberOfYears,
    totalNumberOfDayInYear: dto.totalNumberOfDayInYear,
    capitalizeRate: dto.capitalizeRate,
    discountedRate: dto.discountedRate,
    isHighestBestUsed: false,
    highestBestUsed: {
      areaRai: 0,
      areaNgan: 0,
      areaWa: 0,
      totalWa: 0,
      pricePerSqWa: 0,
      totalValue: 0,
    },
    finalValue: 0,
    finalValueRounded: 0,
    appraisalPrice: 0,
    appraisalPriceRounded: 0,
    sections: dto.sections
      .slice()
      .sort((a, b) => a.displaySeq - b.displaySeq)
      .map(section => ({
        templateId: section.id,
        sectionType: section.sectionType,
        sectionName: section.sectionName,
        identifier: section.identifier,
        displaySeq: section.displaySeq,
        categories: section.categories
          .slice()
          .sort((a, b) => a.displaySeq - b.displaySeq)
          .map(category => ({
            templateId: category.id,
            categoryType: category.categoryType,
            categoryName: category.categoryName,
            identifier: category.identifier,
            displaySeq: category.displaySeq,
            assumptions: category.assumptions
              .slice()
              .sort((a, b) => a.displaySeq - b.displaySeq)
              .map(assumption => {
                let detail: Record<string, unknown>;
                try {
                  detail = JSON.parse(assumption.methodDetailJson) ?? {};
                } catch {
                  detail = {};
                }
                // Method-13 refTargets in seeded templates carry a `dbId` that is
                // the template's own assumption id — but stored as a literal string
                // in MethodDetailJson, so its casing may differ from `assumption.id`
                // (which SQL Server + C# Guid.ToString() normalizes to lowercase).
                // Lowercase when shifting to templateId so the map lookup matches.
                if (assumption.methodTypeCode === '13' && detail?.refTarget) {
                  const rt = detail.refTarget as {
                    kind?: string;
                    dbId?: string | null;
                    templateId?: string | null;
                  };
                  const rawRef = rt.templateId ?? rt.dbId ?? null;
                  detail = {
                    ...detail,
                    refTarget: {
                      kind: rt.kind,
                      templateId: rawRef ? rawRef.toLowerCase() : null,
                    },
                  };
                }
                return {
                  templateId: assumption.id,
                  assumptionType: assumption.assumptionType,
                  assumptionName: assumption.assumptionName,
                  identifier: assumption.identifier,
                  displaySeq: assumption.displaySeq,
                  method: {
                    methodType: assumption.methodTypeCode,
                    detail,
                  },
                };
              }),
          })),
      })),
  } as unknown as DCFTemplateType;
}
