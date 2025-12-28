import type { TableHTMLAttributes } from 'react';

interface TableProps<T extends Record<string, any>> extends TableHTMLAttributes<HTMLTableElement> {
  data: T[];
  headers: { name: keyof T; label: string }[];
}

// TODO: Find actual keys for each mapping here
const Table = <T extends Record<string, any>>({ data, headers, ...props }: TableProps<T>) => {
  return (
    <div className="overflow-x-auto">
      <table className="table w-full" {...props}>
        <thead>
          <tr className="bg-primary/10">
            {headers.map((header, index) => (
              <th key={index} className="text-primary text-sm font-semibold py-3 px-4 text-left first:rounded-tl-lg last:rounded-tr-lg">
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {headers.map((header, index) => (
                <td key={index}>{row[header.name]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
