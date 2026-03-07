import FormTable from '../components/tables/FormTable';
import { SectionHeader } from '@shared/components';

const CustomersForm = () => {
  return (
    <div>
      <SectionHeader title="Customers" />
      <FormTable headers={customersTableHeader} name={'customers'} />
    </div>
  );
};

const customersTableHeader = [
  { label: 'Seq.no', rowNumberColumn: true as true },
  { name: 'name', label: 'Customer Name' },
  { name: 'contactNumber', label: 'Contact Number' },
];

export default CustomersForm;
