import { useTranslation } from 'react-i18next';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import ActivityTrackingContent from '@/features/appraisal/components/summary/ActivityTrackingContent';

interface ActivityTrackingSlideOverProps {
  appraisalId: string | null;
  onClose: () => void;
}

const ActivityTrackingSlideOver = ({ appraisalId, onClose }: ActivityTrackingSlideOverProps) => {
  const { t } = useTranslation('appraisal');
  return (
    <SlideOverPanel
      isOpen={appraisalId !== null}
      onClose={onClose}
      title={t('list.activityTracking')}
      width="2xl"
    >
      {appraisalId && <ActivityTrackingContent appraisalId={appraisalId} />}
    </SlideOverPanel>
  );
};

export default ActivityTrackingSlideOver;
