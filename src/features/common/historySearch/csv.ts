/**
 * CSV export helper for History Search results.
 * Builds a comma-separated string from ResultRow data and triggers a file download.
 */

export interface CsvRow {
  kind: 'appraisal' | 'mc';
  reportNo: string;
  customerName: string | null;
  collateralType: string | null;
  buildingType: string | null;
  date: string | null;
  lat: number;
  lon: number;
  distanceKm: number | null;
  appraisalValue: number | null;
  sellingPrice: number | null;
  offeringPrice: number | null;
}

export interface CsvHeaders {
  type: string;
  reportNo: string;
  customerName: string;
  collateralType: string;
  buildingType: string;
  date: string;
  latitude: string;
  longitude: string;
  distance: string;
  appraisalValue: string;
  sellingPrice: string;
  offeringPrice: string;
}

function escapeCsv(value: string): string {
  // Neutralize spreadsheet formula injection: a cell starting with = + - @ (or tab/CR)
  // can execute as a formula in Excel/Sheets. Prefix with a single quote to defuse.
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) {
    v = `'${v}`;
  }
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB');
}

function formatNum(value: number | null): string {
  return value == null ? '' : String(value);
}

export function buildCsv(
  rows: CsvRow[],
  headers: CsvHeaders,
  showDistance: boolean,
): string {
  const headerRow: string[] = [
    headers.type,
    headers.reportNo,
    headers.customerName,
    headers.collateralType,
    headers.buildingType,
    headers.date,
    headers.latitude,
    headers.longitude,
    ...(showDistance ? [headers.distance] : []),
    headers.appraisalValue,
    headers.sellingPrice,
    headers.offeringPrice,
  ];

  const lines: string[] = [headerRow.map(escapeCsv).join(',')];

  for (const row of rows) {
    const cells: string[] = [
      row.kind === 'appraisal' ? 'Appraisal' : 'Market Comparable',
      row.reportNo,
      row.customerName ?? '',
      row.collateralType ?? '',
      row.buildingType ?? '',
      formatDate(row.date),
      String(row.lat),
      String(row.lon),
      ...(showDistance ? [row.distanceKm != null ? row.distanceKm.toFixed(2) : ''] : []),
      formatNum(row.appraisalValue),
      formatNum(row.sellingPrice),
      formatNum(row.offeringPrice),
    ];
    lines.push(cells.map(escapeCsv).join(','));
  }

  return lines.join('\r\n');
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
