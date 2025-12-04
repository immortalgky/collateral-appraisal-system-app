import FormSection, { type FormField } from '@/shared/components/sections/FormSection';
import SectionHeader from '@shared/components/sections/SectionHeader';

const RequestForm = () => {
  return (
    <div>
      {/*<FormCard title="Request">*/}
      <SectionHeader title="Request" />
      <div className="grid grid-cols-3 gap-4">
        <FormSection fields={requestFields} />
      </div>
      {/*</FormCard>*/}
    </div>
  );
};

const requestFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Appraisal Purpose',
    name: 'purpose',
    options: [
      {
        value: 'a',
        label: 'A',
      },
      {
        value: 'b',
        label: 'B',
      },
    ],
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'boolean-toggle',
    label: 'Customer bring the appraisal book',
    name: 'hasAppraisalBook',
    options: ['Yes', 'No'],
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'string-toggle',
    label: 'Priority',
    name: 'priority',
    options: [
      { name: 'high', label: 'High' },
      { name: 'normal', label: 'Normal' },
    ],
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'dropdown',
    label: 'Previous Appraisal Report No',
    name: 'reference.prevAppraisalNo',
    options: [
      {
        value: 'a',
        label: 'A',
      },
      {
        value: 'b',
        label: 'B',
      },
    ],
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Previous Appraisal Value',
    name: 'reference.prevAppraisalValue',
    wrapperClassName: 'col-span-1',
    disabled: true,
  },
  {
    type: 'date-input',
    label: 'Previous Appraisal Date',
    name: 'reference.prevAppraisalDate',
    wrapperClassName: 'col-span-1',
    disabled: true,
  },
  {
    type: 'dropdown',
    label: 'Channel',
    name: 'channel',
    options: [
      {
        value: 'a',
        label: 'A',
      },
      {
        value: 'b',
        label: 'B',
      },
    ],
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Retail / IBG',
    name: '???', // TODO: find the name
    options: [
      {
        value: 'a',
        label: 'A',
      },
      {
        value: 'b',
        label: 'B',
      },
    ],
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Loan Application No',
    name: 'loanDetail.loanApplicationNo',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Apply/Limit Amount',
    name: 'loanDetail.limitAmt',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Increase Limit Amount',
    name: '???1', // TODO: find the name
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Old Limit Amount',
    name: '???2', // TODO: find the name
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Occurrence of Construction Inspection',
    name: 'occurConstInspec',
    wrapperClassName: 'col-span-1',
    disabled: true,
  },
];

export default RequestForm;
