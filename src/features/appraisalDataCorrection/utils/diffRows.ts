import type { CorrectionRequestBody } from './toCorrectionRequest';
import { labelForField } from '../configs/fieldLabels';

export interface DiffRow {
  /** Unique row key — the form field name, suffixed with the row index for land titles. */
  field: string;
  /** The label the form showed for this field. */
  label: string;
  from: unknown;
  to: unknown;
}

/**
 * Address members hold geocodes, which say nothing to the person confirming the change. The
 * form keeps the readable name beside each code, so the dialog reads that instead — the codes
 * are still what gets sent and what the audit row records.
 */
const DISPLAY_SIBLING: Record<string, string> = {
  subDistrict: 'subDistrictName',
  district: 'districtName',
  province: 'provinceName',
  dopaSubDistrict: 'dopaSubDistrictName',
  dopaDistrict: 'dopaDistrictName',
  dopaProvince: 'dopaProvinceName',
};

/** The form field a DTO member came from — the reverse of `TO_DTO_NAME`. */
function formNameFor(section: string, member: string): string {
  const suffix = section === 'land' ? 'Land' : section === 'building' ? 'Building' : '';
  return suffix && (member === 'ownerName' || member === 'isOwnerVerified')
    ? `${member}${suffix}`
    : member;
}

/**
 * Turns the request body into before/after rows for the confirm dialog.
 *
 * `from` comes from the seeded defaults — the values as loaded from the record — while `to`
 * comes from the submitted values. An earlier version read both from the same object and
 * showed every row as "X → X", which confirms nothing.
 */
export function buildDiffRows(
  body: CorrectionRequestBody,
  defaults: Record<string, unknown> | undefined,
  values: Record<string, unknown> | undefined,
): DiffRow[] {
  const rows: DiffRow[] = [];

  for (const [section, payload] of Object.entries(body)) {
    if (section === 'reason' || payload == null) continue;

    if (section === 'landTitles' && Array.isArray(payload)) {
      const originalRows = (defaults?.titles ?? []) as Array<Record<string, unknown>>;
      (payload as Array<Record<string, unknown>>).forEach((row, index) => {
        const original = originalRows.find(r => (r.id ?? r.titleId) === row.titleId);
        for (const [member, value] of Object.entries(row)) {
          if (member === 'titleId') continue;
          rows.push({
            field: `titles.${index}.${member}`,
            label: `${labelForField(member)} (${index + 1})`,
            from: original?.[member],
            to: value,
          });
        }
      });
      continue;
    }

    if (typeof payload !== 'object') continue;

    for (const [member, value] of Object.entries(payload as Record<string, unknown>)) {
      const formName = formNameFor(section, member);
      const display = DISPLAY_SIBLING[member];
      const readable = display && values && display in values;

      rows.push({
        field: `${section}.${member}`,
        label: labelForField(readable ? display : formName),
        from: defaults?.[readable ? display : formName],
        to: readable ? values[display] : value,
      });
    }
  }

  return rows;
}
