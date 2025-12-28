import { FormFields, type FormField } from '@/shared/components/form';
import RadioGroup from '@shared/components/inputs/RadioGroup';
import CheckboxGroup from '@shared/components/inputs/CheckboxGroup';

const landLocationCorrectOptions = [
  { value: 'correct', label: 'Correct' },
  { value: 'incorrect', label: 'Incorrect' },
];

const checkByOptions = [
  { value: 'plot', label: 'Plot' },
  { value: 'rawang', label: 'Rawang' },
  { value: 'other', label: 'Other' },
];

const locationOptions = [
  { value: 'sanitaryZone', label: 'Sanitary Zone' },
  { value: 'municipality', label: 'Municipality' },
  { value: 'subdivisionAdminOrg', label: 'Subdivision Administrative Organization Area' },
  { value: 'bangkokMetropolitan', label: 'Bangkok Metropolitan Area' },
];

const addressFields: FormField[] = [
  {
    type: 'text-input',
    label: 'Other',
    name: 'checkByOther',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Street',
    name: 'street',
    required: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Soi',
    name: 'soi',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Distance',
    name: 'distance',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'text-input',
    label: 'Village',
    name: 'village',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'text-input',
    label: 'Address / Location',
    name: 'addressLocation',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'dropdown',
    label: 'Land Shape',
    name: 'landShape',
    wrapperClassName: 'col-span-3',
    options: [
      { value: 'rectangular', label: 'Rectangular' },
      { value: 'square', label: 'Square' },
      { value: 'irregular', label: 'Irregular' },
      { value: 'triangular', label: 'Triangular' },
    ],
  },
  {
    type: 'dropdown',
    label: 'Types of urban planning',
    name: 'urbanPlanningType',
    wrapperClassName: 'col-span-3',
    options: [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'agricultural', label: 'Agricultural' },
    ],
  },
];

export default function LandLocationForm() {
  return (
    <div className="flex gap-6">
      {/* Section Title */}
      <div className="w-44 flex-shrink-0">
        <h3 className="text-base font-medium">Land Location</h3>
      </div>

      {/* Form Fields */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Correct/Incorrect */}
        <RadioGroup
          name="landLocationCorrect"
          options={landLocationCorrectOptions}
        />

        {/* Check By */}
        <CheckboxGroup
          name="checkBy"
          label="Check by"
          options={checkByOptions}
        />

        {/* Address Fields */}
        <div className="grid grid-cols-6 gap-4">
          <FormFields fields={addressFields} />
        </div>

        {/* Location Checkboxes */}
        <CheckboxGroup
          name="location"
          label="Location"
          options={locationOptions}
        />
      </div>
    </div>
  );
}
