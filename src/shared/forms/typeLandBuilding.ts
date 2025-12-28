import { z } from 'zod';
import { CreateBuildingRequest } from './typeBuilding';
import { CreateLandRequest } from './v2';

export const CreateLandBuildingRequest = z
  .object({
    building: CreateBuildingRequest,
    land: CreateLandRequest,
  })
  .passthrough();

export const CreateLandBuildingResponse = z.object({ isSuccess: z.boolean() }).passthrough();

export type CreateLandBuildingRequestType = z.infer<typeof CreateLandBuildingRequest>;
export type CreateLandBuildingResponseType = z.infer<typeof CreateLandBuildingResponse>;
