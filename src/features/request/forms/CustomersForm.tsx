import FormTable from '../components/tables/FormTable';
import { SectionHeader } from '@shared/components';

const CustomersForm = () => {
  return (
    <div>
      <SectionHeader title="Customers" />
      <FormTable columns={customersColumns} name={'customers'} />
    </div>
  );
};

const customersColumns = [
  { label: 'Seq.no', rowNumberColumn: true as const },
  { name: 'name', label: 'Customer Name', maxLength: 260 },
  { name: 'contactNumber', label: 'Contact Number', maxLength: 20 },
];

export default CustomersForm;
