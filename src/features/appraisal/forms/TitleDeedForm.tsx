import Icon from '@/shared/components/Icon';
import LandTitleTable from '../components/tables/LandTitleTable';
import { landtitlesFields } from '@/features/appraisal/configs/fields';

const TitleDeedForm = () => {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="cas-section-head mb-2 flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <Icon style="solid" name="file-contract" className="size-3.5 text-primary-600" />
        </div>
        <span className="text-sm font-medium leading-tight text-gray-700">Title Detail</span>
      </div>
      <LandTitleTable fields={landtitlesFields} name={'titles'} showRowNumber stickyColumns={2} />
    </div>
  );
};

export default TitleDeedForm;
