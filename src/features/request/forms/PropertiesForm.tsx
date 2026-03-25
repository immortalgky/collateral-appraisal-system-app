import FormTable from '../components/tables/FormTable';
import { SectionHeader } from '../../../shared/components';

const PropertiesForm = () => {
  return (
    <div>
      <SectionHeader title="Properties" />
      <FormTable
        name="properties"
        columns={propertiesColumns}
        sumColumns={['sellingPrice']}
        totalFieldName="detail.loanDetail.totalSellingPrice"
      />
    </div>
  );
};

const propertiesColumns = [
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
  { name: 'sellingPrice', label: 'Selling Price', inputType: 'number', maxIntegerDigits: 15 },
];

export default PropertiesForm;
