import { useTranslation } from 'react-i18next';
import FormCard from '@/shared/components/sections/FormCard';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import InfoField from './InfoField';

// Appraisal data comes through .passthrough() so extra fields are untyped
type AppraisalData = Record<string, any> | undefined;

interface AppraiserInfoSectionProps {
  appraisal: AppraisalData;
}

const AppraiserInfoSection = ({ appraisal }: AppraiserInfoSectionProps) => {
  const { t } = useTranslation('appraisal');
  const localizeCompanyName = useLocalizedCompanyName();

  const appraisalDate = appraisal?.appraisalDate
    ? new Date(String(appraisal.appraisalDate)).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : undefined;

  return (
    <FormCard title={t('view360.appraiserInfoSection.title')} icon="user-check" iconColor="blue">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        <InfoField
          label={t('view360.appraiserInfoSection.company')}
          value={
            appraisal?.companyName
              ? localizeCompanyName(appraisal.companyName, appraisal?.companyNameLocal)
              : appraisal?.companyName
          }
        />
        <InfoField
          label={t('view360.appraiserInfoSection.appraiser')}
          value={appraisal?.appraiserName}
        />
        <InfoField label={t('view360.appraiserInfoSection.appraisalDate')} value={appraisalDate} />
      </div>
    </FormCard>
  );
};

export default AppraiserInfoSection;
