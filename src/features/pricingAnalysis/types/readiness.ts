/**
 * Pricing-analysis readiness types — mirror the API shapes returned by:
 *   - GET /appraisals/{appraisalId}/property-groups/{groupId}  (response.readiness)
 *   - 422 from POST /property-groups/{groupId}/pricing-analysis
 *     (problemDetails.extensions.violations)
 *
 * Keep ViolationCode in sync with `Appraisal.Domain.Appraisals.Specifications.ViolationCodes`
 * on the API side. i18n labels live under the `readiness.*` namespace.
 */

export type ViolationCode =
  | 'MARKET_SURVEY_REQUIRED'
  | 'BUILDING_DETAIL_REQUIRED'
  | 'RENTAL_INFO_REQUIRED'
  | 'RENTAL_SCHEDULE_REQUIRED'
  | 'PROPERTY_NOT_SAVED';

export interface RuleViolationDto {
  code: ViolationCode;
  message: string;
  /** Set when the violation is scoped to a specific property within the group. */
  propertyId?: string | null;
}

export interface PricingAnalysisReadinessDto {
  canStartPricingAnalysis: boolean;
  violations: RuleViolationDto[];
}

/**
 * ProblemDetails extension shape returned on 422 from create/start pricing-analysis.
 * Used by the client-side fallback in case the AP button is somehow clicked while
 * the readiness data is stale.
 */
export interface ReadinessProblemDetails {
  status?: number | null;
  title?: string | null;
  detail?: string | null;
  violations?: RuleViolationDto[];
}
