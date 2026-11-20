import { FormFields, FormSection, FormSheet, type FormField } from '@/shared/components/form';
import {
  leaseInfoField,
  leaseContractField,
  leaseDatesFeesField,
  leaseTermsField,
  leaseRentalTermsField,
  leaseLegalField,
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
    ...leaseLegalField,
    ...leaseOtherField,
  ].map(field => [field.name, field]),
);

const pick = (
  ...entries: (string | [name: string, span: string, narrowSpan?: 3 | 4 | 6 | 12])[]
): FormField[] =>
  entries.map(entry => {
    const [name, span, narrowSpan] = typeof entry === 'string' ? [entry] : entry;
    const field = byName.get(name);
    // Fail loudly: a renamed config field would otherwise just vanish from the form.
    if (!field) throw new Error(`LeaseAgreementForm: no field config named "${name}"`);
    if (!span) return field;
    const rest = (field.wrapperClassName ?? '').replace(/\bcol-span-\d+\b/g, '').trim();
    return { ...field, wrapperClassName: `${span} ${rest}`.trim(), narrowSpan };
  });

const leaseFields = pick(
  // Who and which contract: three to a row.
  ['contractNo', 'col-span-4'],
  ['lessorName', 'col-span-4'],
  ['lesseeName', 'col-span-4'],
  // The term: its start and end beside its length and what is left of it, a quarter each.
  ['leaseStartDate', 'col-span-3'],
  ['leaseEndDate', 'col-span-3'],
  ['leasePeriodAsContract', 'col-span-3'],
  ['remainingLeaseAsAppraisalDate', 'col-span-3'],
  // The money: rent, its adjustment and the extra expenses.
  ['leaseRentFee', 'col-span-4'],
  ['rentAdjust', 'col-span-4'],
  ['additionalExpenses', 'col-span-4'],
  ['contractRenewal', 'col-span-6'],
  ['leaseTerminate', 'col-span-6'],
  ['sublease', 'col-span-12'],
  'rentalTermsImpactingPropertyUse',
  'terminationOfLease',
  // Registration and pledging of the lease: two optional answers on one row (3 + 4) with their
  // hints under them, before the remark. They keep their width down to the narrow rule.
  ['isLeaseRegistered', 'col-span-3', 3],
  ['isLeaseholdPledgeable', 'col-span-4', 4],
  'remark',
);

export default LeaseAgreementForm;
