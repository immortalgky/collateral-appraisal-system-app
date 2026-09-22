import { FormFields, type FormField } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import {
  leaseInfoField,
  leaseContractField,
  leaseDatesFeesField,
  leaseTermsField,
  leaseRentalTermsField,
  leaseOtherField,
} from '../configs/fields';
import { FieldLabels } from '../components/FieldLabels';

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
    {!isLast && <div className="cas-section-rule h-px bg-gray-200 col-span-5 my-2" />}
  </>
);

const LeaseAgreementForm = ({ namePrefix }: { namePrefix?: string }) => {
  return (
    <FieldLabels scope="lease">
      <div className="w-full max-w-full overflow-hidden">
        {/* No page heading: the section header below already names this form, and the tab
          above it says the same thing a third time. */}
        <div className="cas-section-grid cas-sheet grid grid-cols-5 gap-x-6 gap-y-4">
          {/* One section, not six. Split into Information / Contract / Dates & Fees / Terms /
            Rental Terms / Other, a form of eleven fields carried six header bands — more
            chrome than content, and the groups named steps of a lease rather than anything
            the reader has to tell apart. The fields inside still run in that order: parties,
            term, rent and costs, conditions, remark. */}
          <SectionRow title="Contract Information" icon="file-contract" isLast>
            <FormFields fields={leaseFields} namePrefix={namePrefix} />
          </SectionRow>
        </div>
      </div>
    </FieldLabels>
  );
};

/*
 * One section, ordered: who, how long, how much, on what terms. The configs in configs/fields.ts
 * stay as they are and are picked by name; a span given here replaces the config's own col-span.
 */
const byName = new Map(
  [
    ...leaseInfoField,
    ...leaseContractField,
    ...leaseDatesFeesField,
    ...leaseTermsField,
    ...leaseRentalTermsField,
    ...leaseOtherField,
  ].map(field => [field.name, field]),
);

const pick = (...entries: (string | [name: string, span: string])[]): FormField[] =>
  entries.map(entry => {
    const [name, span] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    // Fail loudly: a renamed config field would otherwise just vanish from the form.
    if (!field) throw new Error(`LeaseAgreementForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim() };
  });

const leaseFields = pick(
  ['contractNo', 'col-span-12'],
  ['lessorName', 'col-span-6'],
  ['lesseeName', 'col-span-6'],
  ['leaseStartDate', 'col-span-3'],
  ['leaseEndDate', 'col-span-3'],
  ['leasePeriodAsContract', 'col-span-3'],
  ['remainingLeaseAsAppraisalDate', 'col-span-3'],
  ['contractRenewal', 'col-span-6'],
  ['leaseTerminate', 'col-span-6'],
  ['leaseRentFee', 'col-span-4'],
  ['rentAdjust', 'col-span-4'],
  ['additionalExpenses', 'col-span-4'],
  ['sublease', 'col-span-12'],
  'rentalTermsImpactingPropertyUse',
  'terminationOfLease',
  'remark',
);

export default LeaseAgreementForm;
