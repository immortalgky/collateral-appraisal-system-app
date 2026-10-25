import { FormFields, FormSection, FormSheet, type FormField } from '@/shared/components/form';
import {
  leaseInfoField,
  leaseContractField,
  leaseDatesFeesField,
  leaseTermsField,
  leaseRentalTermsField,
  leaseOtherField,
} from '../configs/fields';
import { FieldLabels } from '../components/FieldLabels';
import { useTranslation } from 'react-i18next';

const LeaseAgreementForm = ({ namePrefix }: { namePrefix?: string }) => {
  const { t } = useTranslation('appraisal');
  return (
    <FieldLabels scope="lease">
      <div className="w-full max-w-full">
        {/* No page heading: the section header below already names this form, and the tab
          above it says the same thing a third time. */}
        <FormSheet>
          {/* One section, not six. Split into Information / Contract / Dates & Fees / Terms /
            Rental Terms / Other, a form of eleven fields carried six header bands — more
            chrome than content, and the groups named steps of a lease rather than anything
            the reader has to tell apart. The fields inside still run in that order: parties,
            term, rent and costs, conditions, remark. */}
          <FormSection title={t('forms.leaseAgreement.groups.contract')} icon="file-contract">
            <FormFields fields={leaseFields} namePrefix={namePrefix} />
          </FormSection>
        </FormSheet>
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
  ['lessorName', 'col-span-12'],
  ['lesseeName', 'col-span-12'],
  ['leaseStartDate', 'col-span-6'],
  ['leaseEndDate', 'col-span-6'],
  // The contract's term and what is left of it, together under the dates they span.
  ['leasePeriodAsContract', 'col-span-6'],
  ['remainingLeaseAsAppraisalDate', 'col-span-6'],
  ['contractRenewal', 'col-span-6'],
  ['leaseTerminate', 'col-span-6'],
  ['leaseRentFee', 'col-span-6'],
  ['rentAdjust', 'col-span-3'],
  ['additionalExpenses', 'col-span-3'],
  ['sublease', 'col-span-12'],
  'rentalTermsImpactingPropertyUse',
  'terminationOfLease',
  'remark',
);

export default LeaseAgreementForm;
