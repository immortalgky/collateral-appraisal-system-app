import { z } from 'zod';
import { buildFormSchema } from '@/shared/components/form';
import { supportingDataDetailFields, supportingDataFields } from '../configs/fields';

// =================================================================
// const getSupportingDetailBySupportingId

// =================================================================

export const createSupportingDataDetailForm = buildFormSchema(supportingDataDetailFields);
export type createSupportingDataDetailFormType = z.infer<typeof createSupportingDataDetailForm>;

export const createSupportingDataForm = buildFormSchema(supportingDataFields);
export type createSupportingDataFormType = z.infer<typeof createSupportingDataForm>;

export const defaultSupportingData: createSupportingDataFormType = {
  importChannel: '',
  importDate: '',
  sourceOfData: null,
  appraisalCompany: null,
  description: null,
};

export const defaultSupportingDataDetail: createSupportingDataDetailFormType = {
  propertyName: null,
  developer: null,
  modelName: null,
  collateralType: '',
  buildingType: '',
  landArea: null,
  usableArea: null,
  projectName: null,
  roomFloor: null,
  houseNo: null,
  subDistrict: null,
  district: null,
  province: null,
  latitude: null,
  longitude: null,
  plotLocationType: null,
  pricePerUnit: null,
  offeringPrice: null,
  sellingPrice: null,
  phoneNo: null,
  informationDate: '',
  website: null,
  sourceUrl: null,
  remark: null,
};
