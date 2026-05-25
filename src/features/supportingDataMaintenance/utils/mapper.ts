import type { CreateSupportingDataType, GetSupportingDataByIdType } from '../api/types';
import type {
  createSupportingDataDetailFormType,
  GetSupportingDataDetailByIdType,
} from '../schemas/form';

export const mapSupportingDataDetailResponseToForm = (
  response: GetSupportingDataDetailByIdType,
): createSupportingDataDetailFormType => {
  return {
    id: response.id,
    propertyName: response.propertyName ?? null,
    developer: response.developer ?? null,
    modelName: response.modelName ?? null,
    collateralType: response.collateralType ?? null,
    buildingType: response.buildingType ?? null,
    landArea: response.landArea ?? null,
    usableArea: response.usableArea ?? null,
    projectName: response.projectName ?? null,
    roomFloor: response.roomFloor ?? null,
    houseNo: response.houseNo ?? null,
    subDistrict: response.subDistrict ?? null,
    district: response.district ?? null,
    province: response.province ?? null,
    latitude: response.latitude ?? null,
    longitude: response.longitude ?? null,
    plotLocationType: response.plotLocationType ?? null,
    pricePerUnit: response.pricePerUnit ?? null,
    offeringPrice: response.offeringPrice ?? null,
    sellingPrice: response.sellingPrice ?? null,
    phoneNo: response.phoneNo ?? null,
    informationDate: response.informationDate ?? null,
    website: response.website ?? null,
    sourceUrl: response.sourceUrl ?? null,
    remark: response.remark ?? null,
  };
};

export const mapSupportingDataResponseToForm = (
  response: GetSupportingDataByIdType,
): CreateSupportingDataType => {
  return {
    importChannel: response.importChannel ?? null,
    importDate: response.importDate ?? null,
    sourceOfData: response.sourceOfData ?? null,
    appraisalCompany: response.appraisalCompany ?? null,
    description: response.description ?? null,
  };
};
