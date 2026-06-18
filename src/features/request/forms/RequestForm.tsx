import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormFields } from '@/shared/components/form';
import SectionHeader from '@/shared/components/sections/SectionHeader';
import { makeRequestFields } from '../configs/fields';
import { useFormContext, useWatch } from 'react-hook-form';
import { useEffect } from 'react';

const RequestForm = () => {
  const { t } = useTranslation('request');
  const fields = useMemo(() => makeRequestFields(t), [t]);
  const { setValue } = useFormContext();
  const purpose = useWatch({ name: 'purpose' });
  const additional = useWatch({ name: 'detail.loanDetail.additionalFacilityLimit' });
  const previous = useWatch({ name: 'detail.loanDetail.previousFacilityLimit' });

  useEffect(() => {
    if (purpose === '02') {
      const sum = (additional ?? 0) + (previous ?? 0);
      setValue('detail.loanDetail.facilityLimit', sum, { shouldDirty: true });
    }
  }, [purpose, additional, previous, setValue]);
  return (
    <div>
      <SectionHeader title={t('forms.request')} />
      <div className="grid grid-cols-3 gap-4">
        <FormFields fields={fields} />
      </div>
    </div>
  );
};

export default RequestForm;
