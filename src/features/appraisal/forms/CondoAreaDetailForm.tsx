import FormTable from '@/features/request/components/tables/FormTable';

interface CondoAreaDetailFormProps {
  name: string;
}
function CondoAreaDetailForm({ name }: CondoAreaDetailFormProps) {
  return (
    <div className="col-span-12 border-2 rounded-2xl border-gray-100">
      <FormTable headers={propertiesTableHeader} name={name} sumColumns={['areaSize']} />
    </div>
  );
}

const propertiesTableHeader = [
  { rowNumberColumn: true as const, label: '#' },
  { name: 'areaDescription', label: 'Area Detail', width: '70%' },
  {
    name: 'areaSize',
    label: 'Area (Sq. M.)',
    inputType: 'number' as const,
    width: '20%',
    align: 'right' as const,
  },
];

export default CondoAreaDetailForm;
