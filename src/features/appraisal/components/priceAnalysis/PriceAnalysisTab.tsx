import { useLocation } from 'react-router-dom';
import { PriceAnalysisAccordion } from './PriceAnalysisAccordion';
import { WQSSection } from './wqs/WQSSection';

export function PriceAnalysisTab(): JSX.Element {
  const location = useLocation();
  const { state } = location;
  const { groupId } = state;
  return (
    <div className="flex flex-col h-full min-h-0">
      <PriceAnalysisAccordion groupId={groupId} />
      <WQSSection />
      {/* <div id="form-scroll-container" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      </div> */}
    </div>
  );
}
