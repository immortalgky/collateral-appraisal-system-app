import FormCard from '@/shared/components/sections/FormCard';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import { useTranslation } from 'react-i18next';

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

  return (
    <FormCard title={t('view360.requestInfoSection.title')} icon="square-info" iconColor="emerald">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoField label={t('view360.requestInfoSection.requestNumber')} value={request?.requestNumber} />
        <InfoField label={t('view360.requestInfoSection.customerName')} value={customer?.name} />
        <InfoField label={t('view360.requestInfoSection.contactNumber')} value={customer?.contactNumber} />
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{t('view360.requestInfoSection.purpose')}</p>
          <p className="text-sm text-gray-900">
            <ParameterDisplay group="AppraisalPurpose" code={request?.purpose} />
          </p>
        </div>
        <InfoField label={t('view360.requestInfoSection.appraisalNumber')} value={appraisal?.appraisalNumber} />
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{t('view360.requestInfoSection.channel')}</p>
          <p className="text-sm text-gray-900">
            <ParameterDisplay group="CHANNEL" code={request?.channel} />
          </p>
        </div>
        <InfoField label={t('view360.requestInfoSection.status')} value={appraisal?.status} />
        <InfoField label={t('view360.requestInfoSection.requestor')} value={request?.requestor?.username} />
      </div>
    </FormCard>
  );
};

const InfoField = ({ label, value }: { label: string; value: any }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
    <p className="text-sm text-gray-900">{value != null ? String(value) : '-'}</p>
  </div>
);

export default RequestInfoSection;
