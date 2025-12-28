import FormTable from '../components/tables/FormTable';
import { SectionHeader } from '@shared/components';

const CustomersForm = () => {
  return (
    <div>
      <SectionHeader title="Customers" />
      {/*<FormCard title="Customers" noPadding>*/}
      <FormTable headers={customersTableHeader} name={'customers'} />
      {/*</FormCard>*/}
    </div>
  );
};

const customersTableHeader = [
  { label: 'Seq.no', rowNumberColumn: true as true },
  { name: 'name', label: 'Customer Name' },
  { name: 'contactNumber', label: 'Contact Number' },
];

export default CustomersForm;
