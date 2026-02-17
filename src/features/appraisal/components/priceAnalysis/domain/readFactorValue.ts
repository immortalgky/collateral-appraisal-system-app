export function readFactorValue(s: {
  dataType: string;
  fieldDecimal?: number | undefined | null;
  value?: string | undefined | null;
}) {
  switch (s.dataType) {
    case 'Numeric':
      return s.fieldDecimal;
    case 'Text':
    case 'Dropdown':
    case 'Data':
      return s.value; // confirm enum name
    default:
      return '';
  }
}
