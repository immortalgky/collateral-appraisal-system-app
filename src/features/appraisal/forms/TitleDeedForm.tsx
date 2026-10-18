import LandTitleTable from '../components/tables/LandTitleTable';
import { landtitlesFields } from '@/features/appraisal/configs/fields';

/** `orderable`: off where title order is not saved (a block project's land). */
const TitleDeedForm = ({ orderable = true }: { orderable?: boolean }) => {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <LandTitleTable fields={landtitlesFields} name={'titles'} orderable={orderable} />
    </div>
  );
};

export default TitleDeedForm;
