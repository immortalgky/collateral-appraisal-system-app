import { Icon } from '@/shared/components';
import { SaleAdjustmentGridSection } from '../features/saleAdjustmentGrid/components/SaleAdjustmentGridSection';
import { WQSSection } from '../features/wqs/components/WQSSection';
import { DirectComparisonSection } from '@features/appraisal/components/priceAnalysis/features/directComparison/components/DirectComparisonSection.tsx';
import type { MethodConfiguration } from '../features/selection/type';
import { useGetConfigMethod } from '../domain/useGetConfigMethod';
import type { PriceAnalysisConfigType } from '../domain/usePriceAnalysisQuery';

export const ActiveMethodPanel = ({
  methodId,
  methodType,
  property,
  marketSurveys,
  configurations,
  onCalculationMethodDirty,
}: {
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  marketSurveys: Record<string, unknown>[];
  configurations: PriceAnalysisConfigType;
  onCalculationMethodDirty: (check: boolean) => void;
}) => {
  /**
   * TODO:
   * (1) read config by using methodId or sth
   * (2) pass config into method components
   */

  const configuration = useGetConfigMethod(methodType, methodConfigurations);

  /** Query template which belong to method type */

  switch (methodType) {
    case 'WQS_MARKET':
      return (
        <WQSSection
          property={property}
          surveys={marketSurveys}
          onCalculationMethodDirty={onCalculationMethodDirty}
        />
      );
    case 'SAG_MARKET':
      return (
        <SaleAdjustmentGridSection
          property={property}
          surveys={marketSurveys}
          methodConfiguration={configuration}
          onCalculationMethodDirty={onCalculationMethodDirty}
        />
      );
    case 'DC_MARKET':
      return (
        <DirectComparisonSection
          property={property}
          surveys={marketSurveys}
          onCalculationMethodDirty={onCalculationMethodDirty}
        />
      );
    default:
      return <></>;
  }
};
