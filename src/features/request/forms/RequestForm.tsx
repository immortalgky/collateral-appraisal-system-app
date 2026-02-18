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
    options: [
      { value: '01', label: 'Request for credit limit' },
      { value: '02', label: 'Request for credit limit increase' },
      { value: '03', label: 'Review collateral value' },
      { value: '04', label: 'Foreclose on debt' },
      { value: '05', label: 'Property awaiting sale' },
      { value: '06', label: 'Inspect construction work' },
      { value: '07', label: 'Evaluate prices to support small investors within the M/F project' },
      { value: '08', label: 'Check the machine installation' },
      { value: '09', label: 'Review the value to support small investors within the M/F project' },
      { value: '10', label: 'Check collateral damage' },
      { value: '11', label: '100% construction inspection' },
      { value: '12', label: 'Request for credit limit (appeal, appraisal price)' },
      { value: '13', label: 'Review of collateral value (Asset warehousing)' },
      { value: '14', label: 'Apply for Credit Limit (PMA)' },
    ],
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'boolean-toggle',
    label: 'Customer bring the appraisal book',
    name: 'detail.hasAppraisalBook',
    options: ['Yes', 'No'],
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
    options: [
      { value: 'LOS', label: 'LOS' },
      { value: 'CLS', label: 'CLS' },
      { value: 'SIBS', label: 'SIBS' },
      { value: 'MANUAL', label: 'Manual' },
    ],
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'dropdown',
    label: 'Banking Segment',
    name: 'detail.loanDetail.bankingSegment',
    options: [
      { value: 'RETAIL', label: 'Retail' },
      { value: 'SME', label: 'SME' },
    ],
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Loan Application No',
    name: 'detail.loanDetail.loanApplicationNumber',
    wrapperClassName: 'col-span-1',
    required: true,
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
  },
  {
    type: 'number-input',
    label: 'Old Limit Amount',
    name: 'detail.loanDetail.previousFacilityLimit',
    wrapperClassName: 'col-span-1',
  },
];

export default RequestForm;
