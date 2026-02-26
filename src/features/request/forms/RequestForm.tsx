import { type FormField, FormFields } from '@/shared/components/form';
import SectionHeader from '@/shared/components/sections/SectionHeader';

const RequestForm = () => {
  return (
    <div>
      <SectionHeader title="Request" />
      <div className="grid grid-cols-3 gap-4">
        <FormFields fields={requestFields} />
      </div>
    </div>
  );
};

const requestFields: FormField[] = [
  // Purpose, hasAppraisalBook, Priority
  {
    type: 'dropdown',
    label: 'Appraisal Purpose',
    name: 'purpose',
    group: 'AppraisalPurpose',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'boolean-toggle',
    label: 'Customer bring the appraisal book',
    name: 'detail.hasAppraisalBook',
    options: ['No', 'Yes'],
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'string-toggle',
    label: 'Priority',
    name: 'priority',
    options: [
      { name: 'normal', label: 'Normal' },
      { name: 'high', label: 'High' },
    ],
    wrapperClassName: 'col-span-2',
  },

  // Previous Appraisal row
  {
    type: 'appraisal-selector',
    label: 'Previous Appraisal Report No',
    name: 'detail.prevAppraisalReportNo',
    idField: 'detail.prevAppraisalId',
    valueField: 'detail.prevAppraisalValue',
    dateField: 'detail.prevAppraisalDate',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Previous Appraisal Value',
    name: 'detail.prevAppraisalValue',
    disabled: true,
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'date-input',
    label: 'Previous Appraisal Date',
    name: 'detail.prevAppraisalDate',
    disabled: true,
    wrapperClassName: 'col-span-1',
  },

  // Channel, Banking Segment, Loan details
  {
    type: 'dropdown',
    label: 'Channel',
    name: 'channel',
    group: 'Channel',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Banking Segment',
    name: 'detail.loanDetail.bankingSegment',
    group: 'BankingSegment',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Loan Application No',
    name: 'detail.loanDetail.loanApplicationNumber',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'number-input',
    label: 'Apply/Limit Amount',
    name: 'detail.loanDetail.facilityLimit',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Increase Limit Amount',
    name: 'detail.loanDetail.additionalFacilityLimit',
    wrapperClassName: 'col-span-1',
    requiredWhen: { field: 'purpose', is: '02' },
  },
  {
    type: 'number-input',
    label: 'Old Limit Amount',
    name: 'detail.loanDetail.previousFacilityLimit',
    wrapperClassName: 'col-span-1',
    requiredWhen: { field: 'purpose', is: '02' },
  },
];

export default RequestForm;
