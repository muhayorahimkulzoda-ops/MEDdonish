import type { ReactNode } from 'react';

type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};

export function AdminTable<T extends { id: string }>({
  rows,
  columns,
  actions,
}: {
  rows: T[];
  columns: Column<T>[];
  actions?: (row: T) => ReactNode;
}) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
          {actions ? <th /> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((column) => (
              <td key={column.key}>{column.render(row)}</td>
            ))}
            {actions ? <td>{actions(row)}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
