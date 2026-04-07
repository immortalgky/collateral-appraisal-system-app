import { FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import {
  leaseInfoField,
  leaseContractField,
  leaseDatesFeesField,
  leaseTermsField,
  leaseRentalTermsField,
  leaseOtherField,
} from '../configs/fields';

interface SectionRowProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="h-px bg-gray-200 col-span-5 my-2" />}
  </>
);

const LeaseAgreementForm = ({ namePrefix }: { namePrefix?: string }) => {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Detail of Lease Agreement</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title="Information" icon="info-circle">
          <FormFields fields={leaseInfoField} namePrefix={namePrefix} />
        </SectionRow>

        <SectionRow title="Contract" icon="file-contract">
          <FormFields fields={leaseContractField} namePrefix={namePrefix} />
        </SectionRow>

        <SectionRow title="Dates & Fees" icon="calendar-days">
          <FormFields fields={leaseDatesFeesField} namePrefix={namePrefix} />
        </SectionRow>

        <SectionRow title="Terms" icon="file-lines">
          <FormFields fields={leaseTermsField} namePrefix={namePrefix} />
        </SectionRow>

        <SectionRow title="Rental Terms" icon="scroll">
          <FormFields fields={leaseRentalTermsField} namePrefix={namePrefix} />
        </SectionRow>

        <SectionRow title="Other" icon="circle-info" isLast>
          <FormFields fields={leaseOtherField} namePrefix={namePrefix} />
        </SectionRow>
      </div>
    </div>
  );
};

export default LeaseAgreementForm;
