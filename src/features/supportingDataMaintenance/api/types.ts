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
