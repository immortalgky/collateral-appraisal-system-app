import type { TFunction } from 'i18next';

// See marketSubLabel.ts for why this is a named alias rather than the bare `TFunction`:
// every caller binds `t` via `useTranslation('pricingAnalysis')`, and a generic
// `TFunction` type-checks against i18next's default namespace instead, silently losing
// the `dcf.names.*` keys this file actually reads from.
type PricingAnalysisTFn = TFunction<'pricingAnalysis'>;

// DCF section/assumption names are not hardcoded strings — they come from
// `parameter.PricingTemplateAssumptions`/`PricingTemplateSections`, copied into every
// appraisal at creation (see Database/Migration/Scripts/20260414180100_SeedData_
// PricingTemplates.sql). Translated here by CODE, never by the English text: an
// appraiser can rename a row on their own appraisal, and a text-keyed map would
// silently mistranslate — or worse, silently miss — exactly those edits while
// appearing to work everywhere else.

// Written out as literals (not a computed template key) because this project's `t()` is
// typed against the closed union of keys generated from the locale files — a computed
// `dcf.names.assumption.${code}` string can never satisfy that union, so TypeScript
// can't prove it's a real key. Keeping every key literal here means an added/renamed
// locale key is a compile error, not a silently-wrong render.
// 'M99' is deliberately absent — it is the user-named custom row (the seed script's own
// comment says so) and must always pass through untranslated, like any unmapped code.
const ASSUMPTION_KEYS = {
  E00: 'dcf.names.assumption.E00',
  E01: 'dcf.names.assumption.E01',
  E02: 'dcf.names.assumption.E02',
  E03: 'dcf.names.assumption.E03',
  E05: 'dcf.names.assumption.E05',
  E06: 'dcf.names.assumption.E06',
  E07: 'dcf.names.assumption.E07',
  E09: 'dcf.names.assumption.E09',
  E10: 'dcf.names.assumption.E10',
  E11: 'dcf.names.assumption.E11',
  E12: 'dcf.names.assumption.E12',
  E13: 'dcf.names.assumption.E13',
  E14: 'dcf.names.assumption.E14',
  E15: 'dcf.names.assumption.E15',
  E17: 'dcf.names.assumption.E17',
  E18: 'dcf.names.assumption.E18',
  E20: 'dcf.names.assumption.E20',
  I01: 'dcf.names.assumption.I01',
  I02: 'dcf.names.assumption.I02',
  I03: 'dcf.names.assumption.I03',
  I04: 'dcf.names.assumption.I04',
  I05: 'dcf.names.assumption.I05',
  I06: 'dcf.names.assumption.I06',
} as const;

const SECTION_KEYS = {
  income: 'dcf.names.section.income',
  expenses: 'dcf.names.section.expenses',
} as const;

// Category names have no code of their own worth keying on — `categoryType` ('income' |
// 'expenses' | 'gop' | 'fixedExps') looks like one but isn't fine-grained enough: the
// seeded templates (Database/Migration/Scripts/20260414180100_SeedData_PricingTemplates.sql)
// have two differently-named categories sharing categoryType 'expenses' ('Direct
// Operating Expenses' and 'Administrative and Management Expenses'), so keying on type
// would render the wrong Thai text for one of them. Keyed on categoryName instead, with
// the same fallback-through-to-raw-name behaviour as an edited assumption name — an
// appraiser-renamed category just doesn't match a key and renders as typed.
//
// 'Operating Income', 'Direct Operating Expenses', 'Administrative and Management
// Expenses', 'Fixed Charge', 'Gross Operating Profit (GOP)' come verbatim from the
// mock's CAT_TH. 'Gross Income' and 'Other Income' are NOT in CAT_TH — team lead is
// flagging those two to the user as unsigned-off wording.
const CATEGORY_KEYS = {
  'Operating Income': 'dcf.names.category.operatingIncome',
  'Gross Income': 'dcf.names.category.grossIncome',
  'Other Income': 'dcf.names.category.otherIncome',
  'Direct Operating Expenses': 'dcf.names.category.directOperatingExpenses',
  'Administrative and Management Expenses': 'dcf.names.category.adminAndManagementExpenses',
  'Gross Operating Profit (GOP)': 'dcf.names.category.grossOperatingProfit',
  'Fixed Charge': 'dcf.names.category.fixedCharge',
} as const;

/** Translates an assumption's name by its `assumptionType` code. Falls through to
 * `fallback` (the assumption's own name, already resolved by the caller) for 'M99' and
 * any code with no translation yet — never renders blank or a raw i18n key. */
export function dcfAssumptionLabel(
  t: PricingAnalysisTFn,
  code: string | null | undefined,
  fallback: string,
): string {
  const key = code ? ASSUMPTION_KEYS[code as keyof typeof ASSUMPTION_KEYS] : undefined;
  return key ? t(key) : fallback;
}

/** Translates a section's name by its `sectionType` ('income' | 'expenses') — sections
 * have no dedicated code column, but these two values are already the stable, code-like
 * identifier every DCF section carries. */
export function dcfSectionLabel(
  t: PricingAnalysisTFn,
  sectionType: string | null | undefined,
  fallback: string,
): string {
  const key = sectionType ? SECTION_KEYS[sectionType as keyof typeof SECTION_KEYS] : undefined;
  return key ? t(key) : fallback;
}

/** Translates a category's name by its literal `categoryName` (see CATEGORY_KEYS above
 * for why — categoryType can't carry this). `fallback` is the category's own name;
 * unmapped or appraiser-edited names fall through to it unchanged. */
export function dcfCategoryLabel(
  t: PricingAnalysisTFn,
  categoryName: string | null | undefined,
  fallback: string,
): string {
  const key = categoryName ? CATEGORY_KEYS[categoryName as keyof typeof CATEGORY_KEYS] : undefined;
  return key ? t(key) : fallback;
}
