import * as XLSX from 'xlsx';
import {
  defaultSupportingDataDetail,
  supportingDataImportRowSchema,
  type SupportingDataDetailFormValue,
} from '../schemas/form';
import { collateralTypeOptions } from '../constants/parameters';

// ---------------------------------------------------------------------------
// Column mapping
// ---------------------------------------------------------------------------
// Keys MUST match the headers in the SupportingData.xlsx template exactly.
// (Sq. No is intentionally ignored — it's a row counter, not a field.)
const COLUMN_TO_FIELD: Record<string, keyof SupportingDataDetailFormValue> = {
  'Phone No': 'phoneNo',
  'Collateral Type': 'collateralType',
  'Land Area (Sq. Wa)': 'landArea',
  'Usable Area (Sq. Meter)': 'usableArea',
  'Price / Unit': 'pricePerUnit',
  'Offering Price': 'offeringPrice',
  'Selling Price': 'sellingPrice',
  Latitude: 'latitude',
  Longitude: 'longitude',
  'Information Date': 'informationDate',
  Remark: 'remark',
};

// Fields coerced to number — Excel cells formatted as text still arrive as
// strings, so we normalize defensively.
const NUMERIC_FIELDS = new Set<keyof SupportingDataDetailFormValue>([
  'landArea',
  'usableArea',
  'latitude',
  'longitude',
  'pricePerUnit',
  'offeringPrice',
  'sellingPrice',
]);

// Best-effort Thai-label → collateral-type-code mapping. The source workbook
// stores Thai labels (อาคารพาณิชย์ etc.) while the dropdown stores numeric
// codes — without translating, the import row would never match an option.
// Adjust as your parameter set evolves.
const THAI_COLLATERAL_TYPE_TO_CODE: Record<string, string> = {
  ที่ดิน: '01', // Land
  อพาร์ทเม้นท์: '08', // Apartment
  อาคารพาณิชย์: '05', // Commercial building → Buildings
  ทาวน์เฮ้าส์: '02', // Townhouse → Land with buildings
  อาคารสำนักงาน: '05', // Office building → Buildings
  โรงงาน: '05', // Factory → Buildings
};

const VALID_COLLATERAL_CODES = new Set(collateralTypeOptions.map(o => o.value));

export interface InvalidRow {
  row: number; // 1-based row number in Excel (excluding header)
  errors: string[];
}

export interface ParseResult {
  valid: SupportingDataDetailFormValue[];
  invalid: InvalidRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert Thai Buddhist-Era date strings to ISO (yyyy-mm-dd).
 * Accepts "dd/mm/yyyy" and "d/m/yyyy", optionally followed by " H:MM:SS".
 * Returns null when the year is implausible (e.g. corrupted "3104" rows in
 * the source workbook) or the string is unparseable.
 */
function thaiBEToISODate(raw: unknown): string | null {
  if (raw == null) return null;

  // Excel may already give us a JS Date for properly-typed date cells.
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Take just the date part if a time component is present.
  const datePart = s.split(/\s+/)[0];
  const m = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  let year = parseInt(m[3], 10);

  // Buddhist-era → Gregorian when the year looks BE.
  if (year > 2400) year -= 543;

  // Plausibility guard — rejects clearly-corrupted rows (e.g. yr 3104).
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Trim, strip HTML-entity-style placeholder whitespace, and collapse empties
 * to null. The source workbook uses the literal "&nbsp;" for "no remark".
 */
function cleanString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v)
    .replace(/&nbsp;/gi, '')
    .trim();
  return s.length === 0 ? null : s;
}

function coerceNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses an uploaded .xlsx file and validates each row against
 * supportingDataImportRowSchema. Returns valid items + invalid row report.
 *
 * Throws if the file is not a parseable Excel workbook.
 */
export async function parseSupportingDataExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

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

  // Base row defaults — spread before overlaying parsed values so that
  // fields not present in the workbook arrive with sensible defaults
  // (matches what `handleAddSupportingData` produces for new rows).
  const baseRow = defaultSupportingDataDetail as unknown as SupportingDataDetailFormValue;

  rows.forEach((row, idx) => {
    const candidate: Record<string, unknown> = { ...baseRow };

    for (const [columnHeader, fieldName] of Object.entries(COLUMN_TO_FIELD)) {
      if (!(columnHeader in row)) continue;
      const cell = row[columnHeader];

      if (NUMERIC_FIELDS.has(fieldName)) {
        candidate[fieldName] = coerceNumber(cell);
      } else if (fieldName === 'informationDate') {
        candidate[fieldName] = thaiBEToISODate(cell) ?? '';
      } else {
        candidate[fieldName] = cleanString(cell);
      }
    }

    // Translate Thai collateral-type label → code so the dropdown matches.
    const rawType = candidate.collateralType;
    if (typeof rawType === 'string') {
      const trimmed = rawType.trim();
      if (THAI_COLLATERAL_TYPE_TO_CODE[trimmed]) {
        candidate.collateralType = THAI_COLLATERAL_TYPE_TO_CODE[trimmed];
      } else if (VALID_COLLATERAL_CODES.has(trimmed)) {
        candidate.collateralType = trimmed;
      } else {
        // Leave the raw value so validation surfaces the mismatch.
        candidate.collateralType = trimmed;
      }
    }

    const result = supportingDataImportRowSchema.safeParse(candidate);
    if (result.success) {
      valid.push(result.data as SupportingDataDetailFormValue);
    } else {
      invalid.push({
        row: idx + 2, // +1 for header, +1 for 1-based
        errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
    }
  });

  return { valid, invalid };
}
