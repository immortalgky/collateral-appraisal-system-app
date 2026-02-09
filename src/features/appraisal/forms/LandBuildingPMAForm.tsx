import { FormFields, type FormField } from '@/shared/components/form';
import { type ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

const Section = ({ title, children }: SectionProps) => {
  return (
    <div className="mb-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        <div className="h-px bg-gray-200" />
      </div>
      <div className="grid grid-cols-9 gap-4">{children}</div>
    </div>
  );
};

const LandBuildingPMAForm = () => {
  return (
    <div>
      <Section title="PMA">
        <FormFields fields={pmaField} />
      </Section>

      <Section title="Property">
        <FormFields fields={propertyField} />
      </Section>
    </div>
  );
};

const pmaField: FormField[] = [
  {
    type: 'number-input',
    label: 'Selling Price',
    name: 'sellingPrice',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Force Selling Price',
    name: 'forcedSalePrice',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Building Insurance',
    name: 'buildingInsurancePrice',
    wrapperClassName: 'col-span-3',
    required: true,
  },
];

const propertyField: FormField[] = [
  {
    type: 'text-input',
    label: 'Rawang',
    name: 'rawang',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Land No.',
    name: 'landNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Survey No.',
    name: 'surveyNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Title Deed No.',
    name: 'titleNo',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Book No.',
    name: 'bookNumber',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'text-input',
    label: 'Page No.',
    name: 'pageNumber',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Rai',
    name: 'areaRai',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Ngan',
    name: 'areaNgan',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'number-input',
    label: 'Wa',
    name: 'areaSquareWa',
    wrapperClassName: 'col-span-1',
    required: true,
  },
  {
    type: 'location-selector',
    label: 'Sub District',
    name: 'subDistrict',
    districtField: 'district',
    districtNameField: 'districtName',
    provinceField: 'province',
    provinceNameField: 'provinceName',
    postcodeField: 'postcode',
    subDistrictNameField: 'subDistrictName',
    wrapperClassName: 'col-span-3',
    required: true,
  },
  {
    type: 'text-input',
    label: 'District',
    name: 'districtName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-3',
  },
  {
    type: 'text-input',
    label: 'Province',
    name: 'provinceName',
    disabled: true,
    required: true,
    wrapperClassName: 'col-span-3',
  },
];

export default LandBuildingPMAForm;
