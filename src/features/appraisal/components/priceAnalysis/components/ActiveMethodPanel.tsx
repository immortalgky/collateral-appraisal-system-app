import { PROPERTIES } from '../data/data';
import { SaleAdjustmentGridSection } from '../features/saleAdjustmentGrid/components/SaleAdjustmentGridSection';
import { WQSSection } from '../features/wqs/components/WQSSection';
import { DirectComparisonSection } from '@features/appraisal/components/priceAnalysis/features/directComparison/components/DirectComparisonSection.tsx';

export const ActiveMethodPanel = ({
  methodId,
  property,
  marketSurveys,
  onCalculationMethodDirty,
}: {
  methodId: string;
  property: any;
  marketSurveys: any;
  onCalculationMethodDirty: (check: boolean) => void;
}) => {
  /**
   * TODO:
   * (1) read config by using methodId or sth
   * (2) pass config into method components
   */

  const value = methodId;
  switch (value) {
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
