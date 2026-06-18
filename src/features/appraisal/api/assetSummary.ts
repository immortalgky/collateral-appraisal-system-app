import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

export interface AssetSummaryGroup {
  id: string;
  assetGroupDetail: string | null;
  sumEstimatedPrice: number | null;
  roundEstimatedPrice: number | null;
  sumCurrentPrice: number | null;
  roundCurrentPrice: number | null;
  groupSet: number;
}

export interface AssetSummaryItem {
  id: string;
  propertyType: string;
  assetDetail: string | null;
  area: number | null;
  pricePerUnit: number | null;
  estimatedPrice: number | null;
  currentPrice: number | null;
  groupSet: number;
  isPricesCurrent: boolean | null;
}

export interface AssetSummaryDto {
  items: AssetSummaryItem[];
  groups: AssetSummaryGroup[];
}

export const useGetAssetSummary = (id: string | undefined) => {
  return useQuery({
    queryKey: ['assetSummary', id],
    queryFn: async (): Promise<AssetSummaryDto> => {
      const { data } = await axios.get<AssetSummaryDto>(`/appraisals/${id}/asset-summary`);
      return data;
    },
    enabled: !!id,
    retry: false,
  });
};
