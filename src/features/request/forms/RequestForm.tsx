import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormFields } from '@/shared/components/form';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import {
  FACILITY_SUM_PURPOSE,
  NO_FACILITY_PURPOSES,
  makeChannelFields,
  makeLimitFields,
  makePurposeFields,
} from '../configs/fields';
import PriorAppraisalBlock from '../components/PriorAppraisalBlock';

interface RequestFormProps {
  /**
   * The request has been submitted (a route-back included): its purpose and its prior appraisal are
   * locked.
   */
  submitted?: boolean;
}

const RequestForm = ({ submitted = false }: RequestFormProps) => {
  const { t } = useTranslation('request');
  const purposeFields = useMemo(
    () =>
      makePurposeFields(t).map(field =>
        submitted && field.name === 'purpose' ? { ...field, disabled: true } : field,
      ),
    [t, submitted],
  );
  const channelFields = useMemo(() => makeChannelFields(t), [t]);
  const limits = useMemo(() => makeLimitFields(t), [t]);
  const { setValue } = useFormContext();
  const purpose = useWatch({ name: 'purpose' });
  const additional = useWatch({ name: 'detail.loanDetail.additionalFacilityLimit' });
  const previous = useWatch({ name: 'detail.loanDetail.previousFacilityLimit' });

  useEffect(() => {
    if (purpose === FACILITY_SUM_PURPOSE) {
      const sum = (additional ?? 0) + (previous ?? 0);
      setValue('detail.loanDetail.facilityLimit', sum, { shouldDirty: true });
    }
  }, [purpose, additional, previous, setValue]);

  // Only the limits the purpose uses are rendered. A limit left out is not cleared: its value stays
  // in the form (and is submitted) exactly as when the field was shown disabled.
  const limitFields = useMemo(() => {
    if (NO_FACILITY_PURPOSES.includes(purpose)) return [];
    // Before a purpose is chosen the facility limit shows like any other purpose's (not required yet).
    if (purpose !== FACILITY_SUM_PURPOSE) return [limits.facility];
    return [
      limits.additional,
      limits.previous,
      // The total is calculated above, so it is shown but not asked for.
      {
        ...limits.facility,
        label: t('requestForm.totalLimit'),
        required: false,
        requiredWhen: undefined,
        helperText: t('requestForm.autoCalculated'),
      },
    ];
  }, [purpose, limits, t]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SectionHeader title={t('requestForm.sections.purposeAndPrior')} />
        <div className="grid grid-cols-12 gap-x-3.5 gap-y-3">
          <FormFields fields={purposeFields} />
          <PriorAppraisalBlock locked={submitted} />
        </div>
      </div>
      <div>
        <SectionHeader title={t('requestForm.sections.channelAndLimit')} />
        <div className="grid grid-cols-12 gap-x-3.5 gap-y-3">
          <FormFields fields={channelFields} />
          <FormFields fields={limitFields} />
          {NO_FACILITY_PURPOSES.includes(purpose) && (
            <div className="col-span-3">
              <span className="mb-1 block text-xs font-medium text-gray-700">
                {t('requestForm.limitLabel')}
              </span>
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                {t('requestForm.noLimit')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestForm;
