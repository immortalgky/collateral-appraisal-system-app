import { z } from 'zod';
import { buildFormSchema } from '@/shared/components/form';
import {
  decisionFields,
  supportingDataDetailFields,
  supportingDataFields,
} from '../configs/fields';

// ============================== API ===============================

const GetSupportingDataById = z.object({
  id: z.string(),
  isEditable: z.boolean(), // to check authority to edit data of user
  propertyName: z.string().nullable(),
  developer: z.string().nullable(),
  modelName: z.string().nullable(),
  collateralType: z.string(),
  buildingType: z.string(),
  landArea: z.number().nullable(),
  usableArea: z.number().nullable(),
  projectName: z.string().nullable(),
  roomFloor: z.string().nullable(),
  houseNo: z.string().nullable(),
  subDistrict: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  plotLocationType: z.string().nullable(),
  pricePerUnit: z.number().nullable(),
  offeringPrice: z.number().nullable(),
  sellingPrice: z.number().nullable(),
  phoneNo: z.string().nullable(),
  informationDate: z.string().datetime({ offset: true }).nullable(),
  website: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  remark: z.string().nullable(),
});

export type GetSupportingDataDetailByIdType = z.infer<typeof GetSupportingDataById>;

// =================================================================

export const createSupportingDataDetailForm = buildFormSchema(supportingDataDetailFields);
export type createSupportingDataDetailFormType = z.infer<typeof createSupportingDataDetailForm>;

export const decisionForm = buildFormSchema(decisionFields);
export type decisionFormType = z.infer<typeof decisionForm>;

export const createSupportingDataForm = buildFormSchema(supportingDataFields);
export type createSupportingDataFormType = z.infer<typeof createSupportingDataForm>;

export const defaultSupportingData: createSupportingDataFormType = {
  importChannel: null,
  importDate: null,
  sourceOfData: null,
  appraisalCompany: null,
  description: null,
};

export const defaultDecision: decisionFormType = {
  decision: null,
  remark: null,
};

export const defaultSupportingDataDetail: createSupportingDataDetailFormType = {
  propertyName: null,
  developer: null,
  modelName: null,
  collateralType: null,
  buildingType: null,
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
  informationDate: null,
  website: null,
  sourceUrl: null,
  remark: null,
};
