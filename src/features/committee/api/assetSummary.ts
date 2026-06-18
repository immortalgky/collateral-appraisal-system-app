import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

export const assetSummaryKeys = {
  list: () => ['assetSummary', 'list'] as const,
};

export interface AssetSummaryGroup {
  id: string;
  assetGroupDetail: string;
  sumEstimatedPrice: number;
  roundEstimatedPrice: number;
  sumCurrentPrice: number;
  roundCurrentPrice: number;
  groupSet: number;
  isPricesCurrent: boolean;
}

export interface AssetSummaryItem {
  id: string;
  propertyType: string;
  assetDetail: string;
  area: number;
  pricePerUnit: number;
  estimatedPrice: number;
  currentPrice: number;
  groupSet: number;
  isPricesCurrent: boolean;
}

export interface AssetSummaryDto {
  items: AssetSummaryItem[];
  groups: AssetSummaryGroup[];
}

interface GetAssetSummaryResponse {
  items: AssetSummaryItem[];
  groups: AssetSummaryGroup[];
}

export const useGetAssetSummary = (id: string | undefined) => {
  return useQuery({
    queryKey: assetSummaryKeys.list(),
    queryFn: async (): Promise<AssetSummaryDto> => {
      const { data } = await axios.get<GetAssetSummaryResponse>(`/appraisals/${id}/asset-summary`);
      return data;
    },
    enabled: !!id,
  });
};
