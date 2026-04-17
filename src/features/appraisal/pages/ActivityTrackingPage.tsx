import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import ActivityTrackingContent from '@/features/appraisal/components/summary/ActivityTrackingContent';

const ActivityTrackingPage = () => {
  const appraisalId = useAppraisalId();
  if (!appraisalId) return null;
  return <ActivityTrackingContent appraisalId={appraisalId} />;
};

export default ActivityTrackingPage;
