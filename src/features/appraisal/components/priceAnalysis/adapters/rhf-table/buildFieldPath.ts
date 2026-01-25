export const buildFieldPath = (arrayName: string, rowIndex: number, field: string) =>
  `${arrayName}.${rowIndex}.${field}`;
