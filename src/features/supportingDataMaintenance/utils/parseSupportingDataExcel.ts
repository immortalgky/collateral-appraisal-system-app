import * as XLSX from 'xlsx';
import {
  supportingDataDetailSchema,
  defaultSupportingDataDetail,
  type SupportingDataDetailFormValue,
} from '../schemas/form';

// Map Excel column header → schema field name
const COLUMN_TO_FIELD: Record<string, keyof SupportingDataDetailFormValue> = {
  'Property Name': 'propertyName',
  Developer: 'developer',
  Model: 'modelName',
  'Collateral Type': 'collateralType',
  'Building Type': 'buildingType',
  'Land Area': 'landArea',
  'Usable Area': 'usableArea',
  'Project Name': 'projectName',
  'Room Floor': 'roomFloor',
  'House No': 'houseNo',
  'Sub District': 'subDistrict',
  District: 'district',
  Province: 'province',
  Latitude: 'latitude',
  Longitude: 'longitude',
  'Price Per Unit': 'pricePerUnit',
  'Offering Price': 'offeringPrice',
  'Selling Price': 'sellingPrice',
  'Phone No': 'phoneNo',
  'Information Date': 'informationDate',
  Website: 'website',
  'Source URL': 'sourceUrl',
  Remark: 'remark',
};

// Fields that should be coerced to number
const NUMERIC_FIELDS = new Set<keyof SupportingDataDetailFormValue>([
  'landArea',
  'usableArea',
  'latitude',
  'longitude',
]);

export interface InvalidRow {
  row: number; // 1-based row number in Excel (excluding header)
  errors: string[];
}

export interface ParseResult {
  valid: SupportingDataDetailFormValue[];
  invalid: InvalidRow[];
}

/**
 * Parses an uploaded .xlsx file and validates each row against
 * supportingDataDetailSchema. Returns valid items + invalid row report.
 *
 * Throws if the file is not a parseable Excel workbook.
 */
export async function parseSupportingDataExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel file contains no sheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });

  const valid: SupportingDataDetailFormValue[] = [];
  const invalid: InvalidRow[] = [];

  rows.forEach((row, idx) => {
    // Build a candidate item starting from defaults, then overlay mapped cells
    const candidate: Record<string, unknown> = { ...defaultSupportingDataDetail };

    for (const [columnHeader, fieldName] of Object.entries(COLUMN_TO_FIELD)) {
      if (columnHeader in row) {
        let value = row[columnHeader];

        // Coerce numbers
        if (NUMERIC_FIELDS.has(fieldName) && value !== null && value !== '') {
          const num = Number(value);
          value = Number.isFinite(num) ? num : null;
        }

        // Normalize empty strings → null for nullable fields
        if (value === '') value = null;

        candidate[fieldName] = value;
      }
    }

    const result = supportingDataDetailSchema.safeParse(candidate);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        row: idx + 2, // +1 for header, +1 for 1-based
        errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
    }
  });

  return { valid, invalid };
}
