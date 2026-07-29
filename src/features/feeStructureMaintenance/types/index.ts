// FeeName is not stored — the screen resolves it from feeCode via the TypeOfFee parameter group.
export interface FeeStructureDto {
  id: string;
  feeCode: string;
  /**
   * Appraisal type this tier is scoped to, or null for the general ladder that applies to any
   * type. A scoped ladder replaces the general one for that type rather than competing with it.
   */
  appraisalType?: string | null;
  baseAmount: number;
  minSellingPrice: number;
  maxSellingPrice?: number | null;
  isActive: boolean;
}

export type FeeStructureCreateRequest = Omit<FeeStructureDto, 'id'>;

// FeeCode and appraisalType are immutable on update — together they identify which ladder the row
// belongs to.
export type FeeStructureUpdateRequest = Omit<FeeStructureDto, 'id' | 'feeCode' | 'appraisalType'>;
