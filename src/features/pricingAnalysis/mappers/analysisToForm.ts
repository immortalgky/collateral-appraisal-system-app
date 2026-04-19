import type { IncomeAnalysisDto } from '../types/income';
import type { DCFFormType } from '../schemas/dcfForm';

const toNumberArray = (arr: number[] | null | undefined): number[] =>
  (arr ?? []).map(v => Number(v));

export function mapIncomeAnalysisToDCFForm(dto: IncomeAnalysisDto): DCFFormType {
  // Build id-sets for every node level so M13 can validate its refTarget on restore.
  const sectionIds = new Set(dto.sections.map(s => s.id.toLowerCase()));
  const categoryIds = new Set(
    dto.sections.flatMap(s => s.categories.map(c => c.id.toLowerCase())),
  );
  const assumptionIds = new Set(
    dto.sections.flatMap(s => s.categories.flatMap(c => c.assumptions.map(a => a.id.toLowerCase()))),
  );

  const regularSections = dto.sections.map(section => ({
    // Use dbId as clientId so Method-13 modal pickers (which resolve by clientId) continue to work.
    clientId: section.id,
    dbId: section.id,
    sectionType: section.sectionType,
    sectionName: section.sectionName,
    identifier: section.identifier,
    displaySeq: section.displaySeq,
    totalSectionValues: toNumberArray(section.totalSectionValues as number[]),
    categories: section.categories.map(category => ({
      clientId: category.id,
      dbId: category.id,
      categoryType: category.categoryType,
      categoryName: category.categoryName,
      identifier: category.identifier,
      displaySeq: category.displaySeq,
      totalCategoryValues: toNumberArray(category.totalCategoryValues as number[]),
      assumptions: category.assumptions.map(assumption => {
        const method = assumption.method;
        let detail: unknown = method.detail;

        // Method-13: rebuild "kind:guid" clientId so the modal picker stays compatible.
        // Also validates that the referenced node still exists; if it was deleted since
        // the last save, null out both clientId and dbId so the picker shows "Please select".
        if (method.methodTypeCode === '13') {
          const d = detail as {
            proportionPct?: number;
            refTarget?: { kind?: string; clientId?: string | null; dbId?: string | null };
          };
          const rawDbId = d.refTarget?.dbId?.toLowerCase() ?? null;
          const refDbId = rawDbId && rawDbId !== '00000000-0000-0000-0000-000000000000'
            ? rawDbId
            : null;

          // Resolve the id-set for this ref's kind to detect dangling refs.
          const kind = d.refTarget?.kind ?? 'assumption';
          const idSet = kind === 'section' ? sectionIds : kind === 'category' ? categoryIds : assumptionIds;
          const isStillValid = refDbId !== null && idSet.has(refDbId);

          detail = {
            ...d,
            refTarget: {
              kind,
              clientId: isStillValid ? `${kind}:${refDbId}` : null,
              dbId: isStillValid ? refDbId : null,
            },
          };
        }

        return {
          clientId: assumption.id,
          dbId: assumption.id,
          assumptionType: assumption.assumptionType,
          assumptionName: assumption.assumptionName,
          identifier: assumption.identifier,
          displaySeq: assumption.displaySeq,
          totalAssumptionValues: toNumberArray(assumption.totalAssumptionValues as number[]),
          method: {
            clientId: assumption.id,
            dbId: assumption.id,
            methodType: method.methodTypeCode,
            detail: detail as Record<string, unknown> | undefined,
            totalMethodValues: toNumberArray(method.totalMethodValues as number[]),
          },
        };
      }),
    })),
  }));

  // Synthesize the summary section so SectionSummaryDCF renders server-computed arrays.
  // Backend does not persist a summary section row — dto.sections only has income/expense sections.
  const summarySectionType = dto.templateCode.startsWith('direct-') ? 'summaryDirect' : 'summaryDCF';
  const summarySection = {
    clientId: `summary-${dto.id}`,
    dbId: dto.id,
    sectionType: summarySectionType,
    sectionName: 'Summary',
    identifier: 'empty',
    displaySeq: regularSections.length,
    totalSectionValues: [] as number[],
    categories: [],
    // Year-indexed arrays read directly by SectionSummaryDCF via RHFInputCell.
    contractRentalFee: Array.from(dto.summary.contractRentalFee as number[]),
    grossRevenue: Array.from(dto.summary.grossRevenue as number[]),
    grossRevenueProportional: Array.from(dto.summary.grossRevenueProportional as number[]),
    terminalRevenue: Array.from(dto.summary.terminalRevenue as number[]),
    totalNet: Array.from(dto.summary.totalNet as number[]),
    discount: Array.from(dto.summary.discount as number[]),
    presentValue: Array.from(dto.summary.presentValue as number[]),
  };

  return {
    id: dto.id,
    templateCode: dto.templateCode,
    templateName: dto.templateName,
    totalNumberOfYears: dto.totalNumberOfYears,
    totalNumberOfDayInYear: dto.totalNumberOfDayInYear,
    capitalizeRate: Number(dto.capitalizeRate),
    discountedRate: Number(dto.discountedRate),
    finalValue: Number(dto.finalValue ?? 0),
    finalValueRounded: Number(dto.finalValueRounded ?? 0),
    finalValueAdjust: dto.finalValueAdjust != null ? Number(dto.finalValueAdjust) : null,
    isHighestBestUsed: dto.isHighestBestUsed,
    highestBestUsed: {
      areaRai: dto.highestBestUsed?.areaRai ?? null,
      areaNgan: dto.highestBestUsed?.areaNgan ?? null,
      areaWa: dto.highestBestUsed?.areaWa ?? null,
      pricePerSqWa: dto.highestBestUsed?.pricePerSqWa ?? null,
    },
    appraisalPriceRounded: dto.appraisalPriceRounded ?? null,
    sections: [...regularSections, summarySection],
  } as DCFFormType;
}
