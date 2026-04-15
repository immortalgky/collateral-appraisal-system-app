import SlideOverPanel from '@/shared/components/SlideOverPanel';
import ActivityTrackingContent from '@/features/appraisal/components/summary/ActivityTrackingContent';

interface ActivityTrackingSlideOverProps {
  appraisalId: string | null;
  onClose: () => void;
}

const ActivityTrackingSlideOver = ({ appraisalId, onClose }: ActivityTrackingSlideOverProps) => {
  return (
    <SlideOverPanel
      isOpen={appraisalId !== null}
      onClose={onClose}
      title="Activity Tracking"
      width="2xl"
    >
      {appraisalId && <ActivityTrackingContent appraisalId={appraisalId} />}
    </SlideOverPanel>
  );
};

export default ActivityTrackingSlideOver;
