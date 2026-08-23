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
    <div className="cas-section-head col-span-1 pt-1">
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
      {/* No page heading: the section header below already names this form, and the tab
          above it says the same thing a third time. */}
      <div className="cas-section-grid grid grid-cols-5 gap-x-6 gap-y-4">
        {/* One section, not six. Split into Information / Contract / Dates & Fees / Terms /
            Rental Terms / Other, a form of eleven fields carried six header bands — more
            chrome than content, and the groups named steps of a lease rather than anything
            the reader has to tell apart. */}
        <SectionRow title="Contract Information" icon="file-contract" isLast>
          <FormFields fields={leaseInfoField} namePrefix={namePrefix} />
          <FormFields fields={leaseContractField} namePrefix={namePrefix} />
          <FormFields fields={leaseDatesFeesField} namePrefix={namePrefix} />
          <FormFields fields={leaseTermsField} namePrefix={namePrefix} />
          <FormFields fields={leaseRentalTermsField} namePrefix={namePrefix} />
          <FormFields fields={leaseOtherField} namePrefix={namePrefix} />
        </SectionRow>
      </div>
    </div>
  );
};

export default LeaseAgreementForm;
