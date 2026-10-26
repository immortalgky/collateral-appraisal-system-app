import { FormFields } from '@/shared/components/form';
import { useTranslation } from 'react-i18next';
import {
  getContactInformationFields,
  getFinancialDetailsFields,
  getLocationDetailFields,
  getPropertyInformationFields,
  getSourceAndReferenceFields,
} from '../configs/fields';

interface SupportingDataMaintenanceDetailFormProps {
  disabled?: boolean;
}

export function SupportingDataMaintenanceDetailForm({
  disabled,
}: SupportingDataMaintenanceDetailFormProps) {
  const { t } = useTranslation('supportingDataMaintenance');

  // Each block is a titled `section[id]`, which is how the missing-fields chip groups its items.
  return (
    <div className="flex flex-col gap-6 pr-2">
      <section
        id="supporting-property-information"
        aria-labelledby="supporting-property-information-title"
        className="flex gap-6"
      >
        <div className="w-44 flex-shrink-0">
          <h3 id="supporting-property-information-title" className="text-base font-semibold">
            {t('formSections.propertyInformation')}
          </h3>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4">
          <FormFields fields={getPropertyInformationFields(t)} disabled={disabled} />
        </div>
      </section>

      <section
        id="supporting-location-details"
        aria-labelledby="supporting-location-details-title"
        className="flex gap-6"
      >
        <div className="w-44 flex-shrink-0">
          <h3 id="supporting-location-details-title" className="text-base font-semibold">
            {t('formSections.locationDetails')}
          </h3>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4">
          <FormFields fields={getLocationDetailFields(t)} disabled={disabled} />
        </div>
      </section>

      <section
        id="supporting-financial-details"
        aria-labelledby="supporting-financial-details-title"
        className="flex gap-6"
      >
        <div className="w-44 flex-shrink-0">
          <h3 id="supporting-financial-details-title" className="text-base font-semibold">
            {t('formSections.financialDetails')}
          </h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={getFinancialDetailsFields(t)} disabled={disabled} />
          </div>
        </div>
      </section>

      <section
        id="supporting-contact-information"
        aria-labelledby="supporting-contact-information-title"
        className="flex gap-6"
      >
        <div className="w-44 flex-shrink-0">
          <h3 id="supporting-contact-information-title" className="text-base font-semibold">
            {t('formSections.contactInformation')}
          </h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={getContactInformationFields(t)} disabled={disabled} />
          </div>
        </div>
      </section>

      <section
        id="supporting-source-reference"
        aria-labelledby="supporting-source-reference-title"
        className="flex gap-6"
      >
        <div className="w-44 flex-shrink-0">
          <h3 id="supporting-source-reference-title" className="text-base font-semibold">
            {t('formSections.sourceAndReference')}
          </h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={getSourceAndReferenceFields(t)} disabled={disabled} />
          </div>
        </div>
      </section>
    </div>
  );
}
