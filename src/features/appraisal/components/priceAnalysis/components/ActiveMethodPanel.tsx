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
   * (1) read config by using methodId or sth
   * (2) pass config into method components
   */

  console.log(methodId);
  switch (methodId) {
    case 'WQS_MARKET':
      return <WQSSection property={properties} surveys={marketSurveys} />;
    case 'SALEGRID':
      return <div></div>;
    case 'DIRECTCOMPARE':
      return <div></div>;
    default:
      return <></>;
  }
};
