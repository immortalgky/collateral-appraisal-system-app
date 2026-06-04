// ─── List ──────────────────────────────────────────────────────────────────────

export interface BlockReappraisalDueListItem {
  collateralMasterId: string;
  oldAppraisalNumber: string | null;
  projectName: string | null;
  projectType: 'Condo' | 'LandAndBuilding';
  projectSellingPrice: number | null;
  totalUnits: number;
  remainingUnits: number;
  lastAppraisedDate: string | null;
  dueDate: string;
  remainingDay: number;
}

// ─── List query params ─────────────────────────────────────────────────────────

export interface BlockReappraisalListParams {
  pageNumber?: number;
  pageSize?: number;
  projectName?: string;
  oldAppraisalNumber?: string;
}

export type BlockReappraisalFilterValues = Omit<
  BlockReappraisalListParams,
  'pageNumber' | 'pageSize'
>;

// ─── Detail ────────────────────────────────────────────────────────────────────

export interface BlockReappraisalUnitDetail {
  sequenceNumber: number;
  isSold: boolean;
  modelType: string | null;
  usableArea: number | null;
  sellingPrice: number | null;
  /** Condo only */
  floor: number | null;
  /** Condo only */
  towerName: string | null;
  /** Condo only */
  condoRegistrationNumber: string | null;
  /** Condo only */
  roomNumber: string | null;
  /** LandAndBuilding only */
  plotNumber: string | null;
  /** LandAndBuilding only */
  houseNumber: string | null;
  /** LandAndBuilding only */
  numberOfFloors: number | null;
  /** LandAndBuilding only */
  landArea: number | null;
}

export interface BlockReappraisalStructure {
  projectType: 'Condo' | 'LandAndBuilding';
  projectName: string | null;
  developer: string | null;
  address: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  totalUnits: number;
  remainingUnits: number;
  projectSellingPrice: number | null;
  units: BlockReappraisalUnitDetail[];
  models: Array<{ modelName: string }>;
  towers: Array<{ towerName: string }>;
}

export interface BlockReappraisalDetailResult {
  collateralMasterId: string;
  oldAppraisalNumber: string | null;
  projectName: string | null;
  projectType: 'Condo' | 'LandAndBuilding';
  projectSellingPrice: number | null;
  totalUnits: number;
  remainingUnits: number;
  soldUnits: number;
  lastAppraisedDate: string | null;
  dueDate: string;
  structure: BlockReappraisalStructure;
}

// ─── Create result ─────────────────────────────────────────────────────────────

export interface BlockReappraisalCreateResult {
  createdRequestId: string | null;
  requestNumber: string | null;
  groupNumber: string;
  skipped: boolean;
  skipReason: string | null;
}

// ─── Pagination wrapper (matches PaginatedResult<T> from the backend) ──────────

export interface PaginatedResult<T> {
  items: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
}
