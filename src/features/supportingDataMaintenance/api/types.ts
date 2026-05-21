export interface CreateSupportingDataBody {
  importChannel: string;
  importDate: string;
  sourceOfData: string;
  appraisalCompany: null;
  description: string;
  supportingDataDetails: {
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
    plotLocationType: string;
    pricePerUnit: string;
    offeringPrice: number | null;
    sellingPrice: number | null;
    phoneNo: string | null;
    informationDate: string;
    website: string | null;
    sourceUrl: string | null;
    remark: string | null;
  }[];
}

export interface GetSupportingDataMaintenanceListParams {
  pageNumber?: number;
  pageSize?: number;
  status?: string;
  createdDate?: string;
  supportingNumber?: string;
}

export interface SupportingDataMaintenance {
  id?: string;
  supportingNumber?: string;
  createdDate?: string;
  importChannel?: string;
  status?: string;
  lastModifiedDate: string;
  lastModifiedBy: string;
  sourceOfData: string;
}

export interface GetSupportingDataMaintenanceListResponse {
  items: SupportingDataMaintenance[];
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
