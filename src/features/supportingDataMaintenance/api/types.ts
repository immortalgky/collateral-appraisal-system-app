export interface CreateSupportingDataDetailRequest {
  propertyName: string | null;
  developer: string | null;
  modelName: string | null;
  collateralType: string;
  buildingType: string;
  landArea: number | null;
  usableArea: number | null;
  projectName: string | null;
  roomFloor: string | null;
  houseNo: string | null;
  subDistrict: string | null;
  district: string | null;
  province: string | null;
  latitude: number;
  longitude: number;
  plotLocationType: string[] | null;
  plotLocationTypeOther: string | null;
  pricePerUnit: string;
  offeringPrice: number | null;
  sellingPrice: number | null;
  phoneNo: string | null;
  informationDate: string;
  website: string | null;
  sourceUrl: string | null;
  remark: string | null;
}

export interface GetSupportingDataMaintenanceListParams {
  pageNumber?: number;
  pageSize?: number;
  status?: string;
  supportingNumber?: string;
  dateType?: SupportingDataDateType;
  dateFrom?: string;
  dateTo?: string;
}

export interface SupportingDataMaintenance {
  id?: string;
  supportingNumber?: string;
  importDate?: string;
  importChannel?: string;
  movement?: string;
  status?: string;
  createdDate: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  sourceOfData: string;
}

export interface GetSupportingDataMaintenanceListResponse {
  items: SupportingDataMaintenance[];
  hasAuthorityToRemove: boolean;
  hasAuthorityToEdit: boolean;
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface SupportingDataDetailItem {
  id: string;
  propertyName: string | null;
  collateralType: string;
  latitude: number;
  longitude: number;
  houseNo: string | null;
  subDistrictName: string | null;
  districtName: string | null;
  provinceName: string | null;
}

export type SupportingDataDateType = 'createdDate' | 'lastModifiedDate';

export interface SupportingDataParams {
  supportingNumber?: string;
  importChannel?: string;
  status?: string;
  dateType?: SupportingDataDateType;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetSupportingDataDetailListParams {
  supportingId: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetSupportingDataDetailListResponse {
  items: SupportingDataDetailItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetSupportingDataByIdType {
  id?: string;
  supportingNumber?: string;
  hasAuthorityToEdit: boolean;
  hasAuthorityToDecision: boolean;
  status: string;
  importChannel: string;
  importDate: string;
  sourceOfData: string;
  appraisalCompany: string;
  description: string;
  movement?: string;
  remark?: string;
}

export interface UpdateSupportingDataByIdType {
  id: string;
  importChannel: string;
  importDate: string;
  sourceOfData: string;
  description: string;
  decision?: string;
  remark?: string;
}

export interface CreateSupportingDataType {
  importChannel: string;
  importDate: string;
  sourceOfData: string;
  description: string;
}

export interface CreateDecisionDataType {
  decision: string;
  remark?: string;
}
