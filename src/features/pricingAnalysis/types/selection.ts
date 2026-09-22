import type { GetPropertyGroupByIdResponse, PropertyGroupItemDto } from '@features/appraisal/api';
import type {
  FactorDataType,
  MarketComparableDetailType,
  PricingAnalysisConfigType,
} from '../schemas';
import type { FlatContext, ProjectModelPricingContextDto } from '../utils/flattenPricingContext';

export interface PricingAnalysisMethodRequest {
  id: string;
  methodType: string;
  isSelected: boolean;
  isIncluded: boolean;
  appraisalValue: number;
}

export interface PricingAnalysisApproachRequest {
  id: string;
  approachType: string;
  appraisalValue: number;
  isSelected: boolean;
  methods: PricingAnalysisMethodRequest[];
}

export type ApproachMethodLink = {
  apprId: string;
  methodIds: string[]; // pick ONE naming and stick to it
};

export interface Method {
  id?: string;
  methodType: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isIncluded: boolean;
  isSelected: boolean;
  /**
   * Land price per square wa, typed by the appraiser when pricing a Cost-approach group by hand.
   * Its presence is what lets the appraisal summary print ที่ดิน and สิ่งปลูกสร้าง on separate
   * rows — null means the group is priced as one blended figure.
   */
  landRatePerSqWa?: number | null;
  /**
   * Cost approach only: which part of the group's value this method produces. Enforced
   * server-side to exactly these four (`PricingAnalysisMethod.SetRole`) — null is a normal
   * state, not missing data: the method isn't in a Cost approach, or was reverted by
   * UnlinkBuildingCostMethod before being re-tagged. Optional only because not every code path
   * that builds a Method (e.g. project-model subjects) has been confirmed to populate it yet.
   */
  role?: MethodRole | null;
  /**
   * Id of a sibling method *in the same approach* whose value this method was generated from —
   * e.g. a Building Cost method linked to the WQS/SAG/DC method that produced it. Server-side
   * links never cross approach boundaries, so this cannot represent an Income/DCF method
   * holding a copy of a Cost method's value; that's a different, not-yet-modeled relationship.
   */
  linkedMethodId?: string | null;
  /**
   * `PricingAnalysisMethod.Remark` (nvarchar(4000)) — existing per-method note field, already
   * written by several other save commands (SaveMachineCostItems, SaveComparativeAnalysis, ...).
   * Used here for the manual-mode "source of this value" note. Optional until `MethodDto` returns
   * it from the API.
   */
  remark?: string | null;
  /**
   * `PricingAnalysisMethods.UseSystemCalc` — per-method system/manual flag, independent of the
   * group-wide toggle (`GroupDetails.useSystemCalc`). Flipping it is destructive server-side
   * (`PricingAnalysisMethod.SetCalcMode` clears the method's recorded value, unit type and
   * value-per-unit), so callers must confirm before writing it — see
   * PricingAnalysisMethodBoardRow. Defaults to `true` (server default) until `MethodDto` returns
   * it from the generated schema.
   */
  useSystemCalc?: boolean;
  /**
   * `PricingAnalysisMethods.UpdatedAt` — the audit timestamp every entity carries
   * (`Entity<Guid>`), surfaced through `MethodDto` so the board's "last updated" column has
   * something to show. Null until the method's first save: the audit interceptor only stamps
   * it on an actual update, so a freshly created method legitimately has no value here.
   */
  updatedAt?: string | null;
}

/** Exhaustive — `PricingAnalysisMethod.SetRole` (BE) throws on anything outside this set. */
export type MethodRole = 'Land' | 'Building' | 'LandAndBuilding' | 'Machinery';

/** Frontend spelling of the Cost approach type (BE sends `'Cost'`; FE config and
 *  createInitialState both map it to this value — see pricingAnalysis.config.json
 *  and store/createInitialState.ts). */
export const COST_APPROACH_TYPE = 'COSTAPPR';

export interface Approach {
  id?: string;
  approachType: string;
  label: string;
  icon: string;
  appraisalValue: number;
  isSelected: boolean;
  methods: Method[];
}

export interface GroupDetails {
  id: string;
  groupNumber: number;
  groupName: string;
  description: string;
  useSystemCalc: boolean;
  properties: PropertyGroupItemDto[];
}

// export type MarketSurvey;

export type PricingAnalysisSelectorMode = 'editing' | 'summary';

export interface PricingServerData {
  groupDetail: GetPropertyGroupByIdResponse | undefined;
  properties: Record<string, unknown>[] | undefined;
  propertiesMap: Record<string, Record<string, unknown>>;
  marketSurveyDetails: MarketComparableDetailType[];
  allFactors: FactorDataType[] | undefined;
  pricingConfiguration: PricingAnalysisConfigType[] | undefined;
  /** Populated for projectModel subjects only. Used by ModelCardContent. */
  flatContext?: FlatContext;
  /** Raw pricing context DTO — populated for projectModel subjects only. */
  pricingContext?: ProjectModelPricingContextDto;
}

export interface MethodConfiguration {
  methodType: string;
  type: string;

  // sale grid & direct configs
  showQualitativeSection?: boolean;
  showInitialPriceSection?: boolean;
  showSecondRevisionSection?: boolean;
  showAdjustedValueSection?: boolean;
  showAdjustedWeightSection?: boolean;
  showAdjustFinalValueSection?: boolean;
}

/**
 * What the manual Cost-approach card needs to split a group's value into land and building.
 *
 * Both figures come from the server with the pricing analysis: the area is the group's title-deed
 * total and the building figure is its depreciated schedule total — the same one the appraisal
 * summary subtotals as รวมมูลค่าสิ่งปลูกสร้าง. Reading them rather than deriving them here is what
 * keeps the card's arithmetic and the report's rows in agreement.
 */
export interface ManualCostBreakdownContext {
  /** Group land area in square wa. Null or 0 means there is no land to price by rate. */
  landAreaInSqWa: number | null;
  /** Depreciated building total for the group. Null or 0 means the schedule has not been entered. */
  buildingValue: number | null;
  onLandRateSync: (arg: {
    approachType: string;
    methodType: string;
    rate: number | null;
    methodId?: string;
  }) => void;
}
