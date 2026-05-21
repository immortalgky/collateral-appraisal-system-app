import { z } from 'zod';
import { allSupportingDataFields } from '../configs/fields';
import { buildFormSchema } from '@/shared/components/form';

// export const supportingDataDetailSchema = z.object({
//   // Property information
//   propertyName: z.string().nullable().optional(),
//   developer: z.string().nullable().optional(),
//   modelName: z.string().nullable().optional(),
//   collateralType: z.string().min(1, 'Collateral Type is required'),
//   buildingType: z.string().min(1, 'Building Type is required'),
//   landArea: z.number().nullable().optional(),
//   usableArea: z.number().nullable().optional(),

//   // Location details
//   projectName: z.string().nullable().optional(),
//   roomFloor: z.string().nullable().optional(),
//   houseNo: z.string().nullable().optional(),
//   subDistrict: z.string().nullable().optional(),
//   district: z.string().nullable().optional(),
//   province: z.string().nullable().optional(),
//   latitude: z.number().nullable().optional(),
//   longitude: z.number().nullable().optional(),
//   plotLocationType: z.string().nullable().optional(),

//   // Financial details
//   pricePerUnit: z.number().nullable().optional(),
//   offeringPrice: z.number().nullable().optional(),
//   sellingPrice: z.number().nullable().optional(),

//   // Contact information
//   phoneNo: z.string().nullable().optional(),

//   // Source & reference
//   informationDate: z.string().min(1, 'Information Date is required'),
//   website: z.string().nullable().optional(),
//   sourceUrl: z.string().nullable().optional(),
//   remark: z.string().nullable().optional(),
// });

// export const supportingDataSchema = z.object({
//   importChannel: z.enum(['External Information', 'Information from Survey']),
//   importDate: z.date(),
//   sourceOfData: z.string().nullable().optional(),
//   appraisalCompany: z.string().nullable().optional(),
//   description: z.string().nullable().optional(),
//   supportingDataDetails: z.array(supportingDataDetailSchema),
// });

// export type SupportingDataDetailFormValue = z.infer<typeof supportingDataDetailSchema>;
// export type SupportingDataFormValue = z.infer<typeof supportingDataSchema>;

export const createSupportingDataForm = buildFormSchema(allSupportingDataFields);
export type createSupportingDataFormType = z.infer<typeof createSupportingDataForm>;

export const defaultSupportingData: createSupportingDataFormType = {
  importChannel: '',
  importDate: '',
  sourceOfData: null,
  appraisalCompany: null,
  description: null,
  supportingDataDetails: [],
};

export const defaultSupportingDataDetail: createSupportingDataFormType = {
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

// ---------------------------------------------------------------------------
// Row-level schema & types used by the Excel importer.
//
// `supportingDataDetailSchema` mirrors the field-array row shape with
// everything nullable so that a freshly-imported row can be appended to the
// form without tripping interactive validation prematurely.
//
// `supportingDataImportRowSchema` is the stricter gate applied to each parsed
// Excel row — a row that doesn't satisfy it is reported back as an invalid
// row rather than appended to the form.
// ---------------------------------------------------------------------------
export const supportingDataDetailSchema = z.object({
  propertyName: z.string().nullable().optional(),
  developer: z.string().nullable().optional(),
  modelName: z.string().nullable().optional(),
  collateralType: z.string(),
  buildingType: z.string(),
  landArea: z.number().nullable().optional(),
  usableArea: z.number().nullable().optional(),
  projectName: z.string().nullable().optional(),
  roomFloor: z.string().nullable().optional(),
  houseNo: z.string().nullable().optional(),
  subDistrict: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  plotLocationType: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  pricePerUnit: z.number().nullable().optional(),
  offeringPrice: z.number().nullable().optional(),
  sellingPrice: z.number().nullable().optional(),
  phoneNo: z.string().nullable().optional(),
  informationDate: z.string(),
  website: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
});

export type SupportingDataDetailFormValue = z.infer<typeof supportingDataDetailSchema>;

export const supportingDataImportRowSchema = supportingDataDetailSchema.extend({
  collateralType: z.string().min(1, 'Collateral Type is required'),
  latitude: z
    .number({ invalid_type_error: 'Latitude must be a number' })
    .min(-90, 'Latitude out of range')
    .max(90, 'Latitude out of range'),
  longitude: z
    .number({ invalid_type_error: 'Longitude must be a number' })
    .min(-180, 'Longitude out of range')
    .max(180, 'Longitude out of range'),
  informationDate: z.string().min(1, 'Information Date is required'),
});
