import LandTitleTable from '../components/tables/LandTitleTable';
import { landtitlesFields } from '@/features/appraisal/configs/fields';

const TitleDeedForm = () => {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold mb-2 shrink-0">Land Detail</h2>
      <LandTitleTable fields={landtitlesFields} name={'titles'} showRowNumber stickyColumns={2} />
    </div>
  );
};

export default TitleDeedForm;
