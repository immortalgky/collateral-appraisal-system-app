import FormTable from '../components/tables/FormTable';
import { SectionHeader } from '../../../shared/components';

const PropertiesForm = () => {
  return (
    <div>
      <SectionHeader title="Properties" />
      <FormTable
        name="properties"
        headers={propertiesTableHeader}
        sumColumns={['sellingPrice']}
        totalFieldName="detail.loanDetail.totalSellingPrice"
      />
    </div>
  );
};

const propertiesTableHeader = [
  {
    name: 'propertyType',
    label: 'Property Type',
    inputType: 'dropdown',
    group: 'PropertyType',
  },
  {
    name: 'buildingType',
    label: 'Building Type',
    inputType: 'dropdown',
    group: 'BuildingType',
  },
  { name: 'sellingPrice', label: 'Selling Price', inputType: 'number' },
];

export default PropertiesForm;
