import { SaleAdjustmentGridSection } from '../features/saleAdjustmentGrid/SaleAdjustmentGridSection';
import { WQSSection } from '../features/wqs/WQSSection';

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

  const value = methodId;
  switch (value) {
    case 'WQS_MARKET':
      return <WQSSection property={properties} surveys={marketSurveys} />;
    case 'SAG_MARKET':
      return <SaleAdjustmentGridSection property={properties} surveys={marketSurveys} />;
    case 'DIRECTCOMPARE':
      return <div></div>;
    default:
      return <></>;
  }
};
