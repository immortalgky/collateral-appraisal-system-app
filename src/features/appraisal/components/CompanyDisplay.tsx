import Icon from '@/shared/components/Icon';
import type { ExternalCompany } from '../types/administration';

interface CompanyDisplayProps {
  company: ExternalCompany;
  onClear?: () => void;
}

const CompanyDisplay = ({ company, onClear }: CompanyDisplayProps) => {
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Icon key={`full-${i}`} name="star" style="solid" className="w-3 h-3 text-amber-400" />
        ))}
        {hasHalfStar && (
          <Icon name="star-half-stroke" style="solid" className="w-3 h-3 text-amber-400" />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Icon key={`empty-${i}`} name="star" style="regular" className="w-3 h-3 text-gray-300" />
        ))}
        <span className="text-xs text-gray-500 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
      {/* Company Icon */}
      <div className="w-10 h-10 rounded-lg bg-purple-200 flex items-center justify-center shrink-0">
        <Icon name="building" style="solid" className="w-5 h-5 text-purple-700" />
      </div>

      {/* Company Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900">{company.companyName}</span>
          <span className="text-xs text-gray-500">({company.registrationNo})</span>
        </div>
        <div className="flex items-center gap-2 mb-1">{renderStars(company.rating)}</div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Icon name="user" style="regular" className="w-3 h-3" />
            {company.contactPerson}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="phone" style="regular" className="w-3 h-3" />
            {company.contactPhone}
          </span>
        </div>
      </div>

      {/* Active Assignments Badge & Clear Button */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
          {company.activeAssignments} active
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Clear selection"
          >
            <Icon name="xmark" style="solid" className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CompanyDisplay;
