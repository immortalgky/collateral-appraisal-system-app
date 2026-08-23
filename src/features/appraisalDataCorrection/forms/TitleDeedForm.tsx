import Icon from '@/shared/components/Icon';
import LandTitleTable from '../components/LandTitleTable';
import { landtitlesFields } from '../configs/fields';

/**
 * The heading was "Land Detail", the same words the land form itself used, which read as two
 * copies of one section. It is the title deeds, so it says so — and it carries the same
 * `cas-section-head` markup as every SectionRow, so the grid layout bands it identically to
 * LAND INFORMATION instead of leaving a lone bold line above the table.
 */
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
