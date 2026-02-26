import LandTitleTable from '../components/tables/LandTitleTable';

const TitleDeedForm = () => {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold mb-2 shrink-0">Land Detail</h2>
      <LandTitleTable headers={titleDeedTableHeaders} name={'titles'} />
    </div>
  );
};

const titleDeedTableHeaders = [
  { rowNumberColumn: true as const, label: '#' },
  { name: 'titleNumber', label: 'Title Number', disabled: true, type: 'text-input' as const },
  { name: 'titleType', label: 'Title Type', type: 'dropdown' as const, group: 'DeedType' },
  { name: 'bookNumber', label: 'Book Number', disabled: true, colSpan: 4 },
  { name: 'pageNumber', label: 'Page Number', disabled: true },
  { name: 'landParcelNumber', label: 'Land Number', disabled: true },
  { name: 'surveyNumber', label: 'Survey Number', disabled: true },
  { name: 'mapSheetNumber', label: 'Sheet Number', disabled: true },
  {
    name: 'rai',
    label: 'Rai',
    disabled: true,
    colSpan: 2,
    type: 'number-input' as const,
    decimalPlace: 0,
  },
  {
    name: 'ngan',
    label: 'Ngan',
    disabled: true,
    colSpan: 2,
    type: 'number-input' as const,
    decimalPlace: 0,
  },
  {
    name: 'squareWa',
    label: 'Wa',
    disabled: true,
    colSpan: 2,
    type: 'number-input' as const,
    decimalPlace: 2,
  },
  { name: 'rawang', label: 'Rawang', disabled: true },
  { name: 'aerialMapNumber', label: 'Aerial Photo Number', disabled: true },
  {
    name: 'hasBoundaryMarker',
    label: 'Boundary Marker',
    type: 'dropdown' as const,
    group: 'BoundaryMarker',
  },
  {
    name: 'boundaryMarkerRemark',
    label: 'Boundary Other',
    colSpan: 12,
  },
  {
    name: 'isDocumentValidated',
    label: 'Document Validate',
    type: 'dropdown' as const,
    group: 'DocumentValidation',
    colSpan: 4,
    required: true,
  },
  {
    name: 'isMissingFromSurvey',
    label: 'Missed out on the survey',
    type: 'radio-group' as const,
    group: 'MissedOutOnTheSurvey',
    colSpan: 2,
    orientation: 'horizontal' as const,
  },
  {
    name: 'governmentPricePerSqWa',
    label: 'Government Price per Sq.Wa',
    colSpan: 3,
    type: 'number-input' as const,
  },
  {
    name: 'governmentPrice',
    label: 'Government Price',
    disabled: true,
    colSpan: 3,
    type: 'number-input' as const,
  },
];

export default TitleDeedForm;
