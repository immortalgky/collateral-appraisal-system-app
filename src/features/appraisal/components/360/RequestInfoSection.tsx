import { useTranslation } from 'react-i18next';
import FormCard from '@/shared/components/sections/FormCard';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import InfoField from './InfoField';

// Both come through .passthrough() so extra fields are untyped
type AppraisalData = Record<string, any> | undefined;
type RequestData = Record<string, any> | undefined;

interface RequestInfoSectionProps {
  appraisal: AppraisalData;
  request: RequestData;
}

const RequestInfoSection = ({ appraisal, request }: RequestInfoSectionProps) => {
  const { t } = useTranslation('appraisal');
  const customer = request?.customers?.[0];
  // Status codes are PascalCase on the wire — space them for display ("InProgress" -> "In Progress").
  const status =
    typeof appraisal?.status === 'string'
      ? appraisal.status.replace(/([a-z])([A-Z])/g, '$1 $2')
      : appraisal?.status;

  return (
    <FormCard title={t('view360.requestInfoSection.title')} icon="square-info" iconColor="emerald">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        <InfoField
          label={t('view360.requestInfoSection.requestNumber')}
          value={request?.requestNumber}
        />
        <InfoField label={t('view360.requestInfoSection.customerName')} value={customer?.name} />
        <InfoField
          label={t('view360.requestInfoSection.contactNumber')}
          value={customer?.contactNumber}
        />
        <InfoField
          label={t('view360.requestInfoSection.purpose')}
          value={<ParameterDisplay group="AppraisalPurpose" code={request?.purpose} fallback="—" />}
        />
        <InfoField
          label={t('view360.requestInfoSection.appraisalNumber')}
          value={appraisal?.appraisalNumber}
        />
        <InfoField
          label={t('view360.requestInfoSection.channel')}
          value={<ParameterDisplay group="CHANNEL" code={request?.channel} fallback="—" />}
        />
        <InfoField label={t('view360.requestInfoSection.status')} value={status} />
        <InfoField
          label={t('view360.requestInfoSection.requestor')}
          value={request?.requestor?.name || request?.requestor?.employeeId}
        />
      </div>
    </FormCard>
  );
};

export default RequestInfoSection;
