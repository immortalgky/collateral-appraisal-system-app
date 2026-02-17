import { FormFields, type FormField } from '@/shared/components/form';

const SummaryDecisionForm = () => {
  return (
    <div className="grid grid-cols-12 col-span-9 gap-2">
      <FormFields fields={summary} />
    </div>
  );
};

export const DecisionForm = () => {
  return (
    <div className="grid grid-cols-4 col-span-4 gap-2 self-start">
      <FormFields fields={decisionField} />
    </div>
  );
};

export const PriceVerificationForm = () => {
  return (
    <div className="grid grid-cols-12 gap-2">
      <FormFields fields={priceFields} />
    </div>
  );
};

export default SummaryDecisionForm;

const summary: FormField[] = [
  {
    type: 'dropdown',
    label: 'Condition',
    name: 'conditionTemplate',
    options: [
      { value: '01', label: 'Condition Template 1' },
      { value: '02', label: 'Condition Template 2' },
      { value: '03', label: 'Condition Template 3' },
      { value: '04', label: 'Condition Template 4' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'textarea',
    label: '',
    name: 'condition',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'dropdown',
    label: 'Remark',
    name: 'remarkTemplate',
    options: [
      { value: '01', label: 'Remark Template 1' },
      { value: '02', label: 'Remark Template 2' },
      { value: '03', label: 'Remark Template 3' },
      { value: '04', label: 'Remark Template 4' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'textarea',
    label: '',
    name: 'remark',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'dropdown',
    label: 'Summary of Appraiser Opinions',
    name: 'opinionAppraiserTemplate',
    options: [
      { value: '01', label: 'Opinion Appraiser Template 1' },
      { value: '02', label: 'Opinion Appraiser Template 2' },
      { value: '03', label: 'Opinion Appraiser Template 3' },
      { value: '04', label: 'Opinion Appraiser Template 4' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'textarea',
    label: '',
    name: 'opinionAppraiser',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'dropdown',
    label: 'Summary of Appraisal Price Committee Opinions',
    name: 'opinionCommitteeTemplate',
    options: [
      { value: '01', label: 'Opinion Committee Template 1' },
      { value: '02', label: 'Opinion Committee Template 2' },
      { value: '03', label: 'Opinion Committee Template 3' },
      { value: '04', label: 'Opinion Committee Template 4' },
      { value: '99', label: 'Other' },
    ],
    wrapperClassName: 'col-span-4',
  },
  {
    type: 'textarea',
    label: '',
    name: 'opinionCommittee',
    wrapperClassName: 'col-span-12',
  },
  {
    type: 'textarea',
    label: 'Additional / Special Assumptions for Valuation',
    name: 'specialAssumption',
    wrapperClassName: 'col-span-12',
  },
];

const priceFields: FormField[] = [
  {
    type: 'number-input',
    label: 'Total Appraisal Price',
    name: 'appraisalPrice',
    wrapperClassName: 'col-span-4',
    disabled: true,
  },
  {
    type: 'number-input',
    label: 'Force Selling Price',
    name: 'forcedSalePrice',
    wrapperClassName: 'col-span-4',
    disabled: true,
  },
  {
    type: 'number-input',
    label: 'Building Insurance',
    name: 'buildingInsurancePrice',
    wrapperClassName: 'col-span-4',
    disabled: true,
  },
  {
    type: 'boolean-toggle',
    label: 'Price Verification',
    name: 'priceVerification',
    options: ['Verified', 'Not Verified'],
    wrapperClassName: 'col-span-4',
    required: true,
  },
];

const decisionField: FormField[] = [
  {
    type: 'dropdown',
    label: 'Decision',
    name: 'decision',
    wrapperClassName: 'col-span-2',
    options: [
      { value: '01', label: 'Proceed' },
      { value: '02', label: 'Route Back' },
      { value: '99', label: 'Other' },
    ],
    required: true,
  },
  {
    type: 'textarea',
    label: '',
    name: 'remarkDecision',
    wrapperClassName: 'col-span-4',
  },
];
