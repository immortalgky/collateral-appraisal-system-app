import { useLocation } from 'react-router-dom';
import { PriceAnalysisAccordion } from './PriceAnalysisAccordion';

export function PriceAnalysisTab(): JSX.Element {
  const location = useLocation();
  const { state } = location;
  const { groupId } = state;
  return (
    <div className="h-full">
      <PriceAnalysisAccordion groupId={groupId} />
    </div>
  );
}
