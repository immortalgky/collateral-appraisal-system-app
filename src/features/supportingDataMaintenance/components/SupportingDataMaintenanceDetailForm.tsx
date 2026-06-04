import { FormFields } from '@/shared/components/form';
import {
  contactInformationFields,
  financialDetailsFields,
  locationDetailFields,
  propertyInformationFields,
  sourceAndReferenceFields,
} from '../configs/fields';

interface SupportingDataMaintenanceDetailFormProps {
  disabled?: boolean;
}

export function SupportingDataMaintenanceDetailForm({ disabled }: SupportingDataMaintenanceDetailFormProps) {
  return (
    <div className="flex flex-col gap-6 pr-2">
      {/*  */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Property Information</h3>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4">
          <FormFields fields={propertyInformationFields} disabled={disabled} />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Location Details</h3>
        </div>
        <div className="flex-1 grid grid-cols-12 gap-4">
          <FormFields fields={locationDetailFields} disabled={disabled} />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Financial Details</h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={financialDetailsFields} disabled={disabled} />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Contact Information</h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={contactInformationFields} disabled={disabled} />
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Source &amp; Reference Information</h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-12 gap-4">
            <FormFields fields={sourceAndReferenceFields} disabled={disabled} />
          </div>
        </div>
      </div>
    </div>
  );
}
