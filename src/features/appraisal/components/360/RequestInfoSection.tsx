import FormCard from '@/shared/components/sections/FormCard';
import ParameterDisplay from '@/shared/components/ParameterDisplay';

// Both come through .passthrough() so extra fields are untyped
type AppraisalData = Record<string, any> | undefined;
type RequestData = Record<string, any> | undefined;

interface RequestInfoSectionProps {
  appraisal: AppraisalData;
  request: RequestData;
}

const RequestInfoSection = ({ appraisal, request }: RequestInfoSectionProps) => {
  const customer = request?.customers?.[0];

  return (
    <FormCard title="Request Information" icon="square-info" iconColor="emerald">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoField label="Request Number" value={request?.requestNumber} />
        <InfoField label="Customer Name" value={customer?.name} />
        <InfoField label="Contact Number" value={customer?.contactNumber} />
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Purpose</p>
          <p className="text-sm text-gray-900">
            <ParameterDisplay group="AppraisalPurpose" code={request?.purpose} />
          </p>
        </div>
        <InfoField label="Appraisal Number" value={appraisal?.appraisalNumber} />
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Channel</p>
          <p className="text-sm text-gray-900">
            <ParameterDisplay group="CHANNEL" code={request?.channel} />
          </p>
        </div>
        <InfoField label="Status" value={appraisal?.status} />
        <InfoField label="Requestor" value={request?.requestor?.username} />
      </div>
    </FormCard>
  );
};

const InfoField = ({
  label,
  value,
}: {
  label: string;
  value: any;
}) => (
  <div>
    <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
    <p className="text-sm text-gray-900">{value != null ? String(value) : '-'}</p>
  </div>
);

export default RequestInfoSection;
