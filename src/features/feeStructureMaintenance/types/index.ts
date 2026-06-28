// FeeName is not stored — the screen resolves it from feeCode via the TypeOfFee parameter group.
export interface FeeStructureDto {
  id: string;
  feeCode: string;
  baseAmount: number;
  minSellingPrice: number;
  maxSellingPrice?: number | null;
  isActive: boolean;
}

export type FeeStructureCreateRequest = Omit<FeeStructureDto, 'id'>;

// FeeCode is immutable on update — it identifies which fee family the row belongs to.
export type FeeStructureUpdateRequest = Omit<FeeStructureDto, 'id' | 'feeCode'>;
