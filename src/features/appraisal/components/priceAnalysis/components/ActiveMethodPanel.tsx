import { PROPERTIES } from '../data/data';
import { SaleAdjustmentGridSection } from '../features/saleAdjustmentGrid/components/SaleAdjustmentGridSection';
import { WQSSection } from '../features/wqs/components/WQSSection';
import { DirectComparisonSection } from '@features/appraisal/components/priceAnalysis/features/directComparison/components/DirectComparisonSection.tsx';

export const ActiveMethodPanel = ({
  methodId,
  properties,
  marketSurveys,
}: {
  methodId: string;
  properties: any;
  marketSurveys: any;
}) => {
  /**
   * TODO:
   * (1) read config by using methodId or sth
   * (2) pass config into method components
   */

  const property = PROPERTIES[0];
  // const surveys = MOC_SURVEY_DATA;

  const value = methodId;
  switch (value) {
    case 'WQS_MARKET':
      return <WQSSection property={property} surveys={marketSurveys} />;
    case 'SAG_MARKET':
      return <SaleAdjustmentGridSection property={property} surveys={marketSurveys} />;
    case 'DC_MARKET':
      return <DirectComparisonSection property={property} surveys={marketSurveys} />;
    default:
      return <></>;
  }
};
