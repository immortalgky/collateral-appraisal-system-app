import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useWatch } from 'react-hook-form';
import { FormFields } from '@/shared/components/form';
import { SectionHeader } from '@shared/components';
import { makeAddressFields } from '../configs/fields';

/**
 * District, province and postcode in one read-only line. LocationSelector writes them when a
 * sub-district is picked; this only shows what it wrote.
 */
const AddressAutofill = () => {
  const { t } = useTranslation('request');
  const [district, province, postcode] = useWatch({
    name: ['detail.address.districtName', 'detail.address.provinceName', 'detail.address.postcode'],
  });
  const parts = [
    [t('fields.district'), district],
    [t('fields.province'), province],
    [t('fields.postcode'), postcode],
  ].filter(([, value]) => value);

  return (
    <div className="col-span-7 @max-[45.7143rem]:col-span-12">
      <span className="mb-1 block text-xs font-medium text-gray-700">
        {t('fields.district')} · {t('fields.province')} · {t('fields.postcode')}
      </span>
      <div className="flex min-h-10 flex-wrap items-center gap-x-3.5 gap-y-1 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
        {parts.length ? (
          parts.map(([label, value]) => (
            <span key={label}>
              <span className="mr-1 text-xs text-gray-500">{label}</span>
              {value}
            </span>
          ))
        ) : (
          <span className="text-gray-400">{t('requestForm.addressAutofill')}</span>
        )}
      </div>
    </div>
  );
};

const AddressForm = () => {
  const { t } = useTranslation('request');
  const addressFields = useMemo(() => makeAddressFields(t), [t]);

  return (
    <div>
      <SectionHeader
        title={t('requestForm.sections.location')}
        subtitle={t('requestForm.sections.locationNote')}
      />
      <div className="@container">
        <div className="grid grid-cols-12 gap-x-3.5 gap-y-3">
          <FormFields fields={addressFields} namePrefix="detail.address" />
          <AddressAutofill />
        </div>
      </div>
    </div>
  );
};

export default AddressForm;
