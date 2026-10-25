import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import type { ExternalCompany } from '../types/administration';
import StarRating from '@/features/serviceQualityEvaluation/components/StarRating';
import { ClearButton } from './StaffDisplay';

interface CompanyDisplayProps {
  company: ExternalCompany;
  onClear?: () => void;
  /** Shows a "Change company" button that reopens the picker; the selection stays until another is chosen. */
  onChange?: () => void;
  /** Extra tag beside the company name, e.g. "previous company". */
  badge?: string;
}

const CompanyDisplay = ({ company, onClear, onChange, badge }: CompanyDisplayProps) => {
  const { t } = useTranslation('appraisal');
  const localizeCompanyName = useLocalizedCompanyName();

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-gray-800">
            {localizeCompanyName(company.companyName, company.companyNameLocal)}
          </span>
          {company.registrationNo && (
            <span className="text-xs text-gray-500">({company.registrationNo})</span>
          )}
          {badge && (
            <Badge tone="purple" dot={false} className="whitespace-nowrap">
              {badge}
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {company.rating > 0 && (
            <span className="flex items-center gap-1">
              <StarRating score={company.rating} />
              <span>({company.rating.toFixed(1)})</span>
            </span>
          )}
          {company.contactPerson && (
            <span className="flex items-center gap-1">
              <Icon name="user" style="regular" />
              {company.contactPerson}
            </span>
          )}
          {company.contactPhone && (
            <span className="flex items-center gap-1">
              <Icon name="phone" style="regular" />
              {company.contactPhone}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <Badge tone="green" dot={false} className="whitespace-nowrap">
            {t('administration.activeCount', { count: company.activeAssignments })}
          </Badge>
          {onClear && <ClearButton onClick={onClear} />}
        </div>
        {onChange && (
          <Button type="button" variant="outline" size="xs" onClick={onChange}>
            {t('administration.changeCompanyButton')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CompanyDisplay;
