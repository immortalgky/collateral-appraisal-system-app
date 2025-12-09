import LandTitleTable from '../components/tables/LandTitleTable';

const TitleDeedForm = () => {
  return (
    <div className="col-span-12">
      <LandTitleTable headers={titleDeedTableHeaders} name={'landTitle'} />
    </div>
  );
};

const titleDeedTableHeaders = [
  { name: 'titleDeedNo', label: 'Title Deed No.' },
  { name: 'bookNo', label: 'Book No' },
  { name: 'pageNo', label: 'Page No' },
  { name: 'landNo', label: 'Land No' },
  { name: 'surveyNo', label: 'Survey No' },
  { name: 'sheetNo', label: 'Sheet No' },
  { name: 'landArea', label: 'Rai-Ngan-Wa' },
  { name: 'sqWa', label: 'Sq.Wa' },
  { name: 'documentType', label: 'Document Type' },
  { name: 'rawang', label: 'Rawang' },
  { name: 'aerialPhoto', label: 'Aerial Photo No.' },
  { name: 'boundaryMarker', label: 'Boundary Marker' },
  { name: 'documentValidate', label: 'Document Validate' },
  { name: 'governmentPriceperArea', label: 'Government Price per Sq.Wa' },
  { name: 'governmentPrice', label: 'Government Price' },
];

export default TitleDeedForm;
