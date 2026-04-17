import type { DCFFormType } from '../schemas/dcfForm';
import type {
  SaveIncomeAnalysisRequest,
  IncomeSectionInput,
  IncomeCategoryInput,
  IncomeAssumptionInput,
} from '../types/income';

// Runtime form nodes carry clientId/dbId outside the Zod schema — access them via casts.
type RuntimeAssumption = {
  clientId?: string | null;
  assumptionType: string;
  assumptionName: string;
  identifier: string;
  displaySeq: number;
  totalAssumptionValues: unknown[];
  method: { methodType: string; detail?: unknown; totalMethodValues?: unknown[] };
};
type RuntimeCategory = {
  clientId?: string | null;
  categoryType: string;
  categoryName: string;
  identifier: string;
  displaySeq: number;
  assumptions: RuntimeAssumption[];
};
type RuntimeSection = {
  clientId?: string | null;
  sectionType: string;
  sectionName: string;
  identifier: string;
  displaySeq: number;
  categories?: RuntimeCategory[];
};

function mapRefTargetClientId(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  // Form stores "kind:guid"; backend expects bare guid only.
  return raw.includes(':') ? raw.split(':')[1] : raw;
}

// The existing modal flow can put assumptionParams entries (objects like
// { code, description }) into assumptionType/assumptionName instead of strings.
// Normalize defensively so backend always gets a string.
function toStringField(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as { code?: unknown; description?: unknown };
    if (typeof o.code === 'string') return o.code;
    if (typeof o.description === 'string') return o.description;
  }
  return '';
}

function mapAssumptions(assumptions: RuntimeAssumption[]): IncomeAssumptionInput[] {
  return assumptions
    // Drop incomplete rows (newly-added but never edited via modal): no methodType set.
    .filter(a => typeof a.method?.methodType === 'string' && a.method.methodType !== '')
    .map(assumption => {
      const method = assumption.method;
      let detail: unknown = method.detail ?? {};

      // Method-13: strip the "kind:" prefix from refTarget.clientId before sending.
      if (method.methodType === '13') {
        const d = detail as {
          proportionPct?: number;
          refTarget?: { kind?: string; clientId?: string | null; dbId?: string | null };
        };
        detail = {
          ...d,
          refTarget: {
            kind: d.refTarget?.kind,
            clientId: mapRefTargetClientId(d.refTarget?.clientId),
            dbId: d.refTarget?.dbId ?? null,
          },
        };
      }

      return {
        assumptionType: toStringField(assumption.assumptionType),
        assumptionName: toStringField(assumption.assumptionName),
        identifier: typeof assumption.identifier === 'string' ? assumption.identifier : 'positive',
        displaySeq: assumption.displaySeq,
        methodTypeCode: method.methodType as string,
        detail,
        clientId: assumption.clientId ?? undefined,
      } satisfies IncomeAssumptionInput;
    });
}

function mapCategories(categories: RuntimeCategory[]): IncomeCategoryInput[] {
  return categories.map(category => ({
    categoryType: category.categoryType,
    categoryName: category.categoryName,
    identifier: category.identifier,
    displaySeq: category.displaySeq,
    assumptions: mapAssumptions(category.assumptions),
    clientId: category.clientId ?? undefined,
  } satisfies IncomeCategoryInput));
}

export function mapDCFFormToSaveRequest(form: DCFFormType): SaveIncomeAnalysisRequest {
  // Only send sections with categories (income/expense). Skip summaryDCF/summaryDirect —
  // those are server-computed and must not be in the request.
  const inputSections: IncomeSectionInput[] = (form.sections as unknown as RuntimeSection[])
    .filter(section =>
      section.sectionType !== 'summaryDCF' && section.sectionType !== 'summaryDirect',
    )
    .map(section => ({
      sectionType: section.sectionType,
      sectionName: section.sectionName,
      identifier: section.identifier,
      displaySeq: section.displaySeq,
      categories: mapCategories(section.categories ?? []),
      clientId: section.clientId ?? undefined,
    } satisfies IncomeSectionInput));

  return {
    templateCode: form.templateCode,
    templateName: form.templateName ?? form.templateCode,
    totalNumberOfYears: form.totalNumberOfYears,
    totalNumberOfDayInYear: form.totalNumberOfDayInYear,
    capitalizeRate: form.capitalizeRate,
    discountedRate: form.discountedRate,
    // Forward finalValueRounded so user manual overrides persist; backend treats
    // 0 or null as "no override" and recomputes from finalValue.
    finalValueRounded: form.finalValueRounded ?? null,
    sections: inputSections,
  };
}
