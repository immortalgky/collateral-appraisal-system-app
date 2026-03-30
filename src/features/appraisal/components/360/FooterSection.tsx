import FormCard from '@/shared/components/sections/FormCard';

// Appraisal data comes through .passthrough() so extra fields are untyped
type AppraisalData = Record<string, any> | undefined;

interface FooterSectionProps {
  appraisal: AppraisalData;
}

const FooterSection = ({ appraisal }: FooterSectionProps) => {
  return (
    <FormCard title="Appraiser Information" icon="user-check" iconColor="gray">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InfoField label="Company" value={appraisal?.companyName} />
        <InfoField label="Appraiser" value={appraisal?.appraiserName} />
        <InfoField
          label="Appraisal Date"
          value={
            appraisal?.appraisalDate
              ? new Date(String(appraisal.appraisalDate)).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : undefined
          }
        />
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

export default FooterSection;
