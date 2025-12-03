import FormCard from '@/shared/components/sections/FormCard';
import FormTable from '../components/tables/FormTable';

const CustomersForm = () => {
  return (
    <FormCard title="Customers" noPadding>
      <FormTable headers={customersTableHeader} name={'customers'} />
    </FormCard>
  );
};

const customersTableHeader = [
  { label: 'Seq.no', rowNumberColumn: true as true },
  { name: 'name', label: 'Customer Name' },
  { name: 'contactNumber', label: 'Contact Number' },
];

export default CustomersForm;
