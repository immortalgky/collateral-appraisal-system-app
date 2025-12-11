import LandTitleTable from '../components/tables/LandTitleTable';

const TitleDeedForm = () => {
  return (
    <div>
      <LandTitleTable headers={titleDeedTableHeaders} name={'landTitle'} />
    </div>
  );
};

const titleDeedTableHeaders = [
  { name: 'titleDeedNo', label: 'Title Deed No.', disabledOnEdit: true },
  { name: 'bookNo', label: 'Book No', disabledOnEdit: true, colSpan: 4 },
  { name: 'pageNo', label: 'Page No', disabledOnEdit: true },
  { name: 'landNo', label: 'Land No', disabledOnEdit: true },
  { name: 'surveyNo', label: 'Survey No', disabledOnEdit: true },
  { name: 'sheetNo', label: 'Sheet No', disabledOnEdit: true },
  { name: 'rai', label: 'Rai', disabledOnEdit: true, colSpan: 2 },
  { name: 'ngan', label: 'Ngan', disabledOnEdit: true, colSpan: 2 },
  { name: 'wa', label: 'Wa', disabledOnEdit: true, colSpan: 2 },
  { name: 'sqWa', label: 'Sq.Wa', disabledOnEdit: true, colSpan: 2 },
  { name: 'documentType', label: 'Document Type', disabledOnEdit: true },
  { name: 'rawang', label: 'Rawang', disabledOnEdit: true },
  { name: 'aerialPhoto', label: 'Aerial Photo No.', disabledOnEdit: true },
  {
    name: 'boundaryMarker',
    label: 'Boundary Marker',
    inputType: 'dropdown',
    options: [
      { value: 'Found', label: 'Found' },
      { value: 'Not Found', label: 'Not Found' },
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
    inputType: 'dropdown',
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
    inputType: 'radio-group',
    options: [
      { value: '1', label: 'Yes' },
      { value: '2', label: 'No' },
    ],
    colSpan: 2,
    orientation: 'horizontal',
  },
  { name: 'pricePerSquareWa', label: 'Government Price per Sq.Wa', colSpan: 3 },
  { name: 'governmentPrice', label: 'Government Price', disabledOnEdit: true, colSpan: 3 },
];

export default TitleDeedForm;
