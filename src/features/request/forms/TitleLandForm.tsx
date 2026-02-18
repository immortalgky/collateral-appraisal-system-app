import { type FormField, FormFields } from '@/shared/components/form';

interface TitleLandFormProps {
  index: number;
  variant?: 'land' | 'landAndBuilding';
}

const TitleLandForm = ({ index }: TitleLandFormProps) => {
  return <FormFields fields={landFields} namePrefix={'titles'} index={index} />;
};

const landFields: FormField[] = [
  {
    type: 'dropdown',
    label: 'Title Type',
    name: 'titleType',
    options: [
      { value: 'DEED', label: 'Title Deed' },
      { value: 'NS3', label: 'Nor Sor 3' },
      { value: 'NS3K', label: 'Nor Sor 3 K' },
      { value: 'NS3KO', label: 'Nor Sor 3 Ko' },
      { value: 'RIGHT', label: 'Document of possessory rights to land' },
      { value: 'OTH', label: 'Other' },
    ],
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Title Number',
    name: 'titleNumber',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Book Number',
    name: 'bookNumber',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'text-input',
    label: 'Page Number',
    name: 'pageNumber',
    wrapperClassName: 'col-span-1',
  },
  {
    type: 'text-input',
    label: 'Rawang',
    name: 'rawang',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Land Parcel Number',
    name: 'landParcelNumber',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'text-input',
    label: 'Survey Number',
    name: 'surveyNumber',
    wrapperClassName: 'col-span-2',
  },
  {
    type: 'number-input',
    label: 'Rai',
    name: 'areaRai',
    wrapperClassName: 'col-span-2',
    decimalPlaces: 0,
  },
  {
    type: 'number-input',
    label: 'Ngan',
    name: 'areaNgan',
    wrapperClassName: 'col-span-2',
    decimalPlaces: 0,
  },
  {
    type: 'number-input',
    label: 'Wa',
    name: 'areaSquareWa',
    wrapperClassName: 'col-span-2',
    decimalPlaces: 2,
  },
  {
    type: 'text-input',
    label: 'Owner',
    name: 'ownerName',
    wrapperClassName: 'col-span-6',
  },
  {
    type: 'textarea',
    label: 'Title Detail',
    name: 'notes',
    wrapperClassName: 'col-span-6',
  },
];

export default TitleLandForm;
