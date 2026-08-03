import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

/**
 * Title (Department of Lands) and DOPA (civil registration) are two SEPARATE address masters.
 * They share a shape but not their rows: Title carries historical/merged provinces, non-numeric
 * codes such as "A0", and nullable postcodes. Never treat one as a mirror of the other.
 */
export type AddressDataset = 'title' | 'dopa';

export interface ProvinceDto {
  code: string;
  nameTh: string;
  nameEn: string;
  districtCount: number;
}

export interface DistrictDto {
  code: string;
  nameTh: string;
  nameEn: string;
  provinceCode: string;
  subDistrictCount: number;
}

export interface SubDistrictDto {
  code: string;
  nameTh: string;
  nameEn: string;
  districtCode: string;
  postcode: string | null;
}

export interface SaveProvinceBody {
  code: string;
  nameTh: string;
  nameEn: string;
}

export interface SaveDistrictBody extends SaveProvinceBody {
  provinceCode: string;
}

export interface SaveSubDistrictBody extends SaveProvinceBody {
  districtCode: string;
  postcode: string | null;
}

const base = (dataset: AddressDataset) => `/parameters/addresses/${dataset}`;

export const addressMasterKeys = {
  all: ['address-master'] as const,
  provinces: (dataset: AddressDataset) => [...addressMasterKeys.all, dataset, 'provinces'] as const,
  districts: (dataset: AddressDataset, provinceCode: string) =>
    [...addressMasterKeys.all, dataset, 'districts', provinceCode] as const,
  subDistricts: (dataset: AddressDataset, districtCode: string) =>
    [...addressMasterKeys.all, dataset, 'sub-districts', districtCode] as const,
};

// ── Reads ─────────────────────────────────────────────────────────────────────

export const useProvinces = (dataset: AddressDataset) =>
  useQuery({
    queryKey: addressMasterKeys.provinces(dataset),
    queryFn: async (): Promise<ProvinceDto[]> => {
      const { data } = await axios.get<ProvinceDto[]>(`${base(dataset)}/provinces`);
      return data ?? [];
    },
    staleTime: 60_000,
  });

export const useDistricts = (dataset: AddressDataset, provinceCode: string | null) =>
  useQuery({
    queryKey: addressMasterKeys.districts(dataset, provinceCode ?? ''),
    enabled: !!provinceCode,
    queryFn: async (): Promise<DistrictDto[]> => {
      const { data } = await axios.get<DistrictDto[]>(`${base(dataset)}/districts`, {
        params: { provinceCode },
      });
      return data ?? [];
    },
    staleTime: 60_000,
  });

export const useSubDistricts = (dataset: AddressDataset, districtCode: string | null) =>
  useQuery({
    queryKey: addressMasterKeys.subDistricts(dataset, districtCode ?? ''),
    enabled: !!districtCode,
    queryFn: async (): Promise<SubDistrictDto[]> => {
      const { data } = await axios.get<SubDistrictDto[]>(`${base(dataset)}/sub-districts`, {
        params: { districtCode },
      });
      return data ?? [];
    },
    staleTime: 60_000,
  });

// ── Writes ────────────────────────────────────────────────────────────────────
// Every mutation invalidates the whole dataset subtree: a rename changes the parent label shown
// against children, and a delete changes the parent's child count.

const useAddressMutation = <TBody, TResult>(
  dataset: AddressDataset,
  request: (body: TBody) => Promise<TResult>,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...addressMasterKeys.all, dataset] }),
  });
};

export const useCreateProvince = (dataset: AddressDataset) =>
  useAddressMutation(dataset, async (body: SaveProvinceBody) => {
    const { data } = await axios.post<ProvinceDto>(`${base(dataset)}/provinces`, body);
    return data;
  });

export const useUpdateProvince = (dataset: AddressDataset) =>
  useAddressMutation(dataset, async ({ code, body }: { code: string; body: SaveProvinceBody }) => {
    const { data } = await axios.put<ProvinceDto>(`${base(dataset)}/provinces/${code}`, body);
    return data;
  });

export const useDeleteProvince = (dataset: AddressDataset) =>
  useAddressMutation(dataset, async (code: string) => {
    await axios.delete(`${base(dataset)}/provinces/${code}`);
  });

export const useCreateDistrict = (dataset: AddressDataset) =>
  useAddressMutation(dataset, async (body: SaveDistrictBody) => {
    const { data } = await axios.post<DistrictDto>(`${base(dataset)}/districts`, body);
    return data;
  });

export const useUpdateDistrict = (dataset: AddressDataset) =>
  useAddressMutation(dataset, async ({ code, body }: { code: string; body: SaveDistrictBody }) => {
    const { data } = await axios.put<DistrictDto>(`${base(dataset)}/districts/${code}`, body);
    return data;
  });

export const useDeleteDistrict = (dataset: AddressDataset) =>
  useAddressMutation(dataset, async (code: string) => {
    await axios.delete(`${base(dataset)}/districts/${code}`);
  });

export const useCreateSubDistrict = (dataset: AddressDataset) =>
  useAddressMutation(dataset, async (body: SaveSubDistrictBody) => {
    const { data } = await axios.post<SubDistrictDto>(`${base(dataset)}/sub-districts`, body);
    return data;
  });

export const useUpdateSubDistrict = (dataset: AddressDataset) =>
  useAddressMutation(
    dataset,
    async ({ code, body }: { code: string; body: SaveSubDistrictBody }) => {
      const { data } = await axios.put<SubDistrictDto>(
        `${base(dataset)}/sub-districts/${code}`,
        body,
      );
      return data;
    },
  );

export const useDeleteSubDistrict = (dataset: AddressDataset) =>
  useAddressMutation(dataset, async (code: string) => {
    await axios.delete(`${base(dataset)}/sub-districts/${code}`);
  });
