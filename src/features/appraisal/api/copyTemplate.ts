import axios from '@shared/api/axiosInstance';

// ── Types ──────────────────────────────────────────────────
// Nullability mirrors the backend DTO at
// Modules/Appraisal/.../GetAppraisalCopyTemplate/AppraisalCopyTemplateDto.cs
// — every column on the source request that's nullable in SQL is nullable here.

export interface PrevAppraisalSnapshot {
  appraisalId: string;
  appraisalNumber: string | null;
  appraisalValue: number | null;
  completedDate: string | null;
}

export interface CopyTemplateLoanDetail {
  bankingSegment: string | null;
  loanApplicationNumber: string | null;
  facilityLimit: number | null;
  additionalFacilityLimit: number | null;
  previousFacilityLimit: number | null;
  totalSellingPrice: number | null;
}

export interface CopyTemplateAddress {
  houseNumber: string | null;
  projectName: string | null;
  moo: string | null;
  soi: string | null;
  road: string | null;
  subDistrict: string | null;
  district: string | null;
  province: string | null;
  postcode: string | null;
}

export interface CopyTemplateContact {
  contactPersonName: string | null;
  contactPersonPhone: string | null;
  dealerCode: string | null;
}

export interface CopyTemplateDetail {
  hasAppraisalBook: boolean;
  loanDetail: CopyTemplateLoanDetail | null;
  address: CopyTemplateAddress | null;
  contact: CopyTemplateContact | null;
}

export interface CopyTemplateCustomer {
  name: string | null;
  contactNumber: string | null;
}

export interface CopyTemplateProperty {
  propertyType: string | null;
  buildingType: string | null;
  sellingPrice: number | null;
}

export interface CopyTemplateTitle {
  [key: string]: unknown;
}

export interface CopyTemplateDocument {
  [key: string]: unknown;
}

export interface AppraisalCopyTemplate {
  prevAppraisal: PrevAppraisalSnapshot;
  detail: CopyTemplateDetail;
  customers: CopyTemplateCustomer[];
  properties: CopyTemplateProperty[];
  titles: CopyTemplateTitle[];
  documents: CopyTemplateDocument[];
}

// ── Plain fetch function ────────────────────────────────────
// Not a hook — called imperatively inside the modal's row-click handler.

export async function fetchAppraisalCopyTemplate(
  appraisalId: string,
): Promise<AppraisalCopyTemplate> {
  const { data } = await axios.get<AppraisalCopyTemplate>(
    `/appraisals/${appraisalId}/copy-template`,
  );
  return data;
}
