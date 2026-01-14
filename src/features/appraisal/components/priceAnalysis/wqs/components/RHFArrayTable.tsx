import { columnGroups, columns, rows } from './data';
import { DataTable } from './DataTable';

export const RHFArrayTable = () => {
  return (
    <div>
      <DataTable
        rows={rows}
        columns={columns}
        groups={columnGroups}
        ctx={null}
        hasHeader={true}
        hasBody={true}
        hasFooter={true}
        onAdd={() => null}
        hasAddButton={true}
      />
    </div>
  );
};
