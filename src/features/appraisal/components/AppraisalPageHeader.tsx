import Icon from '@/shared/components/Icon';
import ReturnButton from '@/shared/components/buttons/ReturnButton';
import { useAppraisalContext } from '../context/AppraisalContext';

interface AppraisalPageHeaderProps {
  /** Page title (e.g., "Administration", "Appointment & Fee") */
  title: string;
  /** Icon name for the page */
  icon: string;
  /** Icon background color class (e.g., "bg-indigo-500", "bg-orange-500") */
  iconBgColor: string;
}

/**
 * Compact header component for appraisal pages
 * Shows appraisal number and page-specific title with icon
 */
const AppraisalPageHeader = ({
  title,
  icon,
  iconBgColor,
}: AppraisalPageHeaderProps) => {
  const { appraisal } = useAppraisalContext();

  const appraisalNo = appraisal?.appraisalReportNo || appraisal?.appraisalId || '...';

  return (
    <div className="shrink-0 pb-3">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 px-3 py-2">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-2.5">
            <ReturnButton />
            <div className="h-4 w-px bg-gray-200" />

            {/* Appraisal badge */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/5 rounded-md">
              <Icon style="solid" name="file-certificate" className="size-3 text-primary" />
              <span className="text-xs font-medium text-primary">{appraisalNo}</span>
            </div>

            <Icon style="solid" name="chevron-right" className="size-2.5 text-gray-300" />

            {/* Page icon and title */}
            <div className="flex items-center gap-2">
              <div className={`size-6 rounded-md ${iconBgColor} flex items-center justify-center`}>
                <Icon style="solid" name={icon} className="size-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">{title}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AppraisalPageHeader;
