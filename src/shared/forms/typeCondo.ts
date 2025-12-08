import { z } from 'zod';

export const AreaDetailDto = z
  .object({
    areaDetail: z.string(),
    area: z.coerce.number(),
  })
  .passthrough();

export const testDto = z
  .object({
    testField: z.string(),
  })
  .passthrough();

export const CreateCollateralCondoRequest = z
  .object({
    propertyName: z.string(),
    condoName: z.string(),
    roomNo: z.string(),
    floorNo: z.string(),
    buildingNo: z.string(),
    areaDetails: z.array(AreaDetailDto),
    totalArea: z.coerce.number(),
    test: testDto,
  })
  .passthrough();

export const CreateCollateralCondoRequestDefault: CreateCollateralCondoRequestType = {
  areaDetails: [],
  totalArea: 0,
};

// export const schemas = {
//   AreaDetailDto,
// };

export type CreateCollateralCondoRequestType = z.infer<typeof CreateCollateralCondoRequest>;
export type AreaDetailDtoType = z.infer<typeof AreaDetailDto>;
