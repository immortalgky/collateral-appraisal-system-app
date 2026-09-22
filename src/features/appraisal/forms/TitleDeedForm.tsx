import LandTitleTable from '../components/tables/LandTitleTable';
import { landtitlesFields } from '@/features/appraisal/configs/fields';

const TitleDeedForm = () => {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <LandTitleTable fields={landtitlesFields} name={'titles'} />
    </div>
  );
};

export default TitleDeedForm;
