import LandTitleTable from '../components/tables/LandTitleTable';

const TitleDeedForm = () => {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2 shrink-0">Land Detail</h2>
      <LandTitleTable headers={titleDeedTableHeaders} name={'landTitle'} />
    </div>
  );
};

const titleDeedTableHeaders = [
  { name: 'titleDeedNo', label: 'Title Deed No.', disabled: true },
  { name: 'bookNo', label: 'Book No', disabled: true, colSpan: 4 },
  { name: 'pageNo', label: 'Page No', disabled: true },
  { name: 'landNo', label: 'Land No', disabled: true },
  { name: 'surveyNo', label: 'Survey No', disabled: true },
  { name: 'sheetNo', label: 'Sheet No', disabled: true },
  { name: 'rai', label: 'Rai', disabled: true, colSpan: 2 },
  { name: 'ngan', label: 'Ngan', disabled: true, colSpan: 2 },
  { name: 'wa', label: 'Wa', disabled: true, colSpan: 2 },
  { name: 'totalSqWa', label: 'Sq.Wa', disabled: true, colSpan: 2 },
  { name: 'documentType', label: 'Document Type', disabled: true },
  { name: 'rawang', label: 'Rawang', disabled: true },
  { name: 'aerialPhoto', label: 'Aerial Photo No.', disabled: true },
  {
    name: 'boundaryMarker',
    label: 'Boundary Marker',
    type: 'dropdown',
    options: [
      { value: 'F', label: 'Found' },
      { value: 'NF', label: 'Not Found' },
    ],
  },
  {
    name: 'boundaryOther',
    label: 'Boundary Other',
    colSpan: 12,
  },
  {
    name: 'docValidate',
    label: 'Document Validate',
    type: 'dropdown',
    options: [
      { value: 'CM', label: 'Correctly Matched' },
      { value: 'NM', label: 'Not Matched' },
    ],
    colSpan: 4,
    required: true,
  },
  {
    name: 'isMissedOutSurvey',
    label: 'Missed out on the survey',
    type: 'radio-group',
    options: [
      { value: true, label: 'Yes' },
      { value: false, label: 'No' },
    ],
    colSpan: 2,
    orientation: 'horizontal',
  },
  {
    name: 'pricePerSquareWa',
    label: 'Government Price per Sq.Wa',
    colSpan: 3,
    type: 'number-input',
  },
  {
    name: 'governmentPrice',
    label: 'Government Price',
    disabled: true,
    colSpan: 3,
    type: 'number-input',
  },
];

export default TitleDeedForm;
