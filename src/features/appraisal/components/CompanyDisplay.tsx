import { useTranslation } from 'react-i18next';
import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import type { ExternalCompany } from '../types/administration';
import StarRating from '@/features/serviceQualityEvaluation/components/StarRating';
import { ClearButton, MetaLine, selectedCardClass } from './StaffDisplay';

interface CompanyDisplayProps {
  company: ExternalCompany;
  onClear?: () => void;
  /** Shows a "Change company" button that reopens the picker; the selection stays until another is chosen. */
  onChange?: () => void;
  /** Extra tag beside the company name, e.g. "previous company". */
  badge?: string;
}

/** The stars and the average; "no rating yet" in their place, never 0 stars passed off as a score. */
export const CompanyRating = ({ rating }: { rating: number }) => {
  const { t } = useTranslation('appraisal');
  return rating > 0 ? (
    <span className="flex items-center gap-1">
      <StarRating score={rating} />
      <span>({rating.toFixed(1)})</span>
    </span>
  ) : (
    <span>{t('administration.noRating')}</span>
  );
};

const CompanyDisplay = ({ company, onClear, onChange, badge }: CompanyDisplayProps) => {
  const { t } = useTranslation('appraisal');
  const localizeCompanyName = useLocalizedCompanyName();

  return (
    <div className={`${selectedCardClass} items-start border-l-4 border-l-purple-500`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-(--palette-ink)">
            {localizeCompanyName(company.companyName, company.companyNameLocal)}
          </span>
          {badge && (
            <Badge tone="purple" dot={false} className="whitespace-nowrap">
              {badge}
            </Badge>
          )}
        </div>
        <MetaLine>
          <CompanyRating rating={company.rating} />
          {company.contactPerson && <span>{company.contactPerson}</span>}
          {company.contactPhone && <span>{company.contactPhone}</span>}
          {company.contactEmail && <span>{company.contactEmail}</span>}
        </MetaLine>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone="green" dot={false} className="whitespace-nowrap">
            {t('administration.activeCount', { count: company.activeAssignments })}
          </Badge>
          {onChange && (
            <Button type="button" variant="outline" size="xs" onClick={onChange}>
              {t('administration.changeCompanyButton')}
            </Button>
          )}
        </div>
        {onClear && <ClearButton onClick={onClear} />}
      </div>
    </div>
  );
};

export default CompanyDisplay;
