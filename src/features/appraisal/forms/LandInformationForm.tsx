import { FormFields, type FormField } from '@/shared/components/form';
import RadioGroup from '@shared/components/inputs/RadioGroup';
import { useFormContext } from 'react-hook-form';

const landInformationFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Property Name',
    name: 'propertyName',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Latitude',
    name: 'latitude',
    required: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Longitude',
    name: 'longitude',
    required: true,
    wrapperClassName: 'col-span-3',
  },
  // Location selector (sub-district autocomplete that populates district, province, postcode)
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    wrapperClassName: 'col-span-3',
  },

  // Display fields (autopopulated by location-selector)
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'dropdown',
    label: 'Land Office',
    name: 'landOffice',
    required: true,
    wrapperClassName: 'col-span-2',
    options: [
      { value: 'office1', label: 'Land Office 1' },
      { value: 'office2', label: 'Land Office 2' },
    ],
  },
];

const checkOwnerOptions = [
  { value: 'can', label: 'Can' },
  { value: 'cannot', label: 'Can not' },
];

const isObligationOptions = [
  { value: 'noObligations', label: 'No obligations' },
  { value: 'mortgageAsSecurity', label: 'Mortgage as security' },
];

export default function LandInformationForm() {
  const { register, watch } = useFormContext();
  const checkOwner = watch('checkOwner');

  return (
    <div className="flex gap-6">
      {/* Section Title */}
      <div className="w-44 flex-shrink-0">
        <h3 className="text-base font-medium">Land Information</h3>
      </div>

      {/* Form Fields */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Main Fields */}
        <div className="grid grid-cols-6 gap-4">
          <FormFields fields={landInformationFields} />
        </div>

        {/* Land Description */}
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">
              Land Description
              <span className="text-error ml-1">*</span>
            </span>
          </label>
          <textarea className="textarea textarea-bordered h-24" {...register('landDescription')} />
        </div>

        {/* Check Owner and Owner */}
        <div className="flex gap-6 items-start">
          <div className="w-44">
            <RadioGroup
              name="checkOwner"
              label="Check Owner"
              options={checkOwnerOptions}
              required
            />
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-6 gap-4">
              <FormFields
                fields={[
                  {
                    type: 'text-input',
                    label: 'Owner',
                    name: 'owner',
                    required: checkOwner === 'can',
                    wrapperClassName: 'col-span-6',
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Is Obligation */}
        <div className="flex flex-col gap-4">
          <RadioGroup name="isObligation" label="Is Obligation" options={isObligationOptions} />
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Obligation',
                  name: 'obligation',
                  required: true,
                  wrapperClassName: 'col-span-6',
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
