import type { ProjectType } from '@/features/blockProject/types';

// ─── Re-export for convenience ────────────────────────────────────────────────
export type { ProjectType };

// ─── List ─────────────────────────────────────────────────────────────────────

export interface BlockUnitMaintenanceListItem {
  collateralMasterId: string;
  appraisalReportNo: string | null;
  customerName: string | null;
  projectName: string | null;
  projectType: ProjectType;
  developer: string | null;
  totalUnits: number;
  soldUnits: number;
  unsoldUnits: number;
  updatedOn: string | null;
  updatedBy: string | null;
}

export interface PaginatedBlockUnitMaintenance {
  items: BlockUnitMaintenanceListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

// ─── Project Header (detail page hero) ────────────────────────────────────────

export interface BlockUnitMaintenanceProject {
  collateralMasterId: string;
  appraisalReportNo: string | null;
  projectName: string | null;
  projectType: ProjectType;
}

export interface BlockUnitMaintenanceDetail {
  project: BlockUnitMaintenanceProject;
  units: ProjectUnitDetail[];
}

// ─── Unit Detail ──────────────────────────────────────────────────────────────

export type PurchaseMethod = 'Cash' | 'Loan';

export interface ProjectUnitDetail {
  id: string;
  sequenceNumber: number;
  modelType: string | null;
  /** Condo only */
  towerName: string | null;
  /** Condo only */
  condoRegistrationNumber: string | null;
  /** Condo only */
  roomNumber: string | null;
  /** Condo only */
  floor: number | null;
  /** LandAndBuilding only */
  plotNumber: string | null;
  /** LandAndBuilding only */
  houseNumber: string | null;
  /** LandAndBuilding only */
  numberOfFloors: number | null;
  /** LandAndBuilding only */
  landArea: number | null;
  usableArea: number | null;
  sellingPrice: number | null;
  isSold: boolean;
  purchaseBy: PurchaseMethod | null;
  loanBankName: string | null;
}

// ─── Update Payload ───────────────────────────────────────────────────────────

export interface UnitSaleInfo {
  unitId: string;
  isSold: boolean;
  purchaseBy: PurchaseMethod | null;
  loanBankName: string | null;
}

export interface UpdateUnitSaleStatusPayload {
  items: UnitSaleInfo[];
}

// ─── Local Edit State ─────────────────────────────────────────────────────────

/** Mutable edit state tracked per-unit in local state Map. */
export interface UnitEditState {
  isSold: boolean;
  purchaseBy: PurchaseMethod | null;
  loanBankName: string;
}
