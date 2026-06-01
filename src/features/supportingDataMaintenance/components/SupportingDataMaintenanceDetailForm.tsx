import { FormFields } from '@/shared/components/form';
import { useTranslation } from 'react-i18next';
import {
  getContactInformationFields,
  getFinancialDetailsFields,
  getLocationDetailFields,
  getPropertyInformationFields,
  getSourceAndReferenceFields,
} from '../configs/fields';

export function SupportingDataMaintenanceDetailForm() {
  const { t } = useTranslation('supportingDataMaintenance');

  return (
    <div className="flex flex-col gap-6 pr-2">
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('formSections.propertyInformation')}</h3>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4">
          <FormFields fields={getPropertyInformationFields(t)} />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('formSections.locationDetails')}</h3>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4">
          <FormFields fields={getLocationDetailFields(t)} />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('formSections.financialDetails')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={getFinancialDetailsFields(t)} />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('formSections.contactInformation')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={getContactInformationFields(t)} />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">{t('formSections.sourceAndReference')}</h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={getSourceAndReferenceFields(t)} />
          </div>
        </div>
      </div>
    </div>
  );
}
