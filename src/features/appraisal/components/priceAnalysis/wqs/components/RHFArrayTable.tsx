import { columnGroups, columns } from './data';
import { DataTable } from './DataTable';

export const RHFArrayTable = () => {
  return (
    <div>
      <DataTable columns={columns} groups={columnGroups} hasHeader={true} />
    </div>
  );
};
