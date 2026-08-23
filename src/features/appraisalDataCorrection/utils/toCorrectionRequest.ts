import { DTO_MEMBERS } from '../configs/dtoMembers';

/**
 * The create/edit forms this feature reuses keep every field at the top level
 * (`ownerNameLand`, `buildingNumber`, `titles[]`), while the correction API takes them grouped
 * by detail (`land: { ownerName }`, `building: { … }`, `landTitles: [ … ]`).
 *
 * Rather than force the forms into the API's shape — which would mean forking them and losing
 * the reason we reuse them — the translation happens here, at the boundary, driven by the
 * generated DTO member lists.
 */

/**
 * Form field names that differ from their DTO member name.
 *
 * Only the owner fields need this: land-and-building flattens two details into one form, so
 * both had to be suffixed. Deliberately absent are `districtName`/`provinceName` and their
 * dopa twins — those are display mirrors the location selector fills alongside the codes, and
 * the DTO's `district`/`province` hold codes. Mapping the name fields onto them would write
 * "บางรัก" into a column that stores "1004".
 */
const TO_DTO_NAME: Record<string, string> = {
  ownerNameLand: 'ownerName',
  isOwnerVerifiedLand: 'isOwnerVerified',
  ownerNameBuilding: 'ownerName',
  isOwnerVerifiedBuilding: 'isOwnerVerified',
};

/**
 * A section of the request body. `landTitle` is excluded because title rows arrive as an array
 * under their own key and take a separate path through `buildCorrectionRequest`.
 *
 * Section order matters for land-and-building, where both details are flattened into one form:
 * the *Land / *Building suffixes disambiguate the owner fields, and anything else is claimed by
 * the first section whose DTO accepts it.
 */
type SectionKey = Exclude<keyof typeof DTO_MEMBERS, 'landTitle'>;

function sectionFor(formFieldName: string, availableSections: SectionKey[]): SectionKey | null {
  if (formFieldName.endsWith('Land')) return availableSections.includes('land') ? 'land' : null;
  if (formFieldName.endsWith('Building')) {
    return availableSections.includes('building') ? 'building' : null;
  }

  const dtoName = TO_DTO_NAME[formFieldName] ?? formFieldName;
  for (const section of availableSections) {
    const members = (DTO_MEMBERS as Record<string, readonly string[]>)[section];
    if (members?.includes(dtoName)) return section;
  }
  return null;
}

/** Sections a given property type actually carries, in claim order. */
export function sectionsForType(typeCode: string): SectionKey[] {
  const map: Record<string, SectionKey[]> = {
    L: ['land'],
    B: ['building'],
    LB: ['land', 'building'],
    U: ['condo'],
    VEH: ['vehicle'],
    VES: ['vessel'],
    MAC: ['machinery'],
    LSL: ['land', 'leaseAgreement'],
    LSB: ['building', 'leaseAgreement'],
    LS: ['land', 'building', 'leaseAgreement'],
    LSU: ['condo', 'leaseAgreement'],
  };
  return map[typeCode] ?? [];
}

/**
 * Walks react-hook-form's `dirtyFields` and returns only what the user actually edited.
 *
 * RHF marks a leaf `true` when touched; nested objects and arrays mirror the value shape. A
 * field left alone is absent, which is what makes the API's "null means unchanged" contract
 * safe — an untouched field never reaches the wire at all.
 */
function dirtyLeaves(
  dirty: unknown,
  values: unknown,
  path: string[] = [],
  out: Array<{ path: string[]; value: unknown }> = [],
): Array<{ path: string[]; value: unknown }> {
  if (dirty === true) {
    out.push({ path, value: values });
    return out;
  }
  if (Array.isArray(dirty)) {
    dirty.forEach((d, i) => dirtyLeaves(d, (values as unknown[])?.[i], [...path, String(i)], out));
    return out;
  }
  if (dirty && typeof dirty === 'object') {
    for (const [key, child] of Object.entries(dirty as Record<string, unknown>)) {
      dirtyLeaves(child, (values as Record<string, unknown>)?.[key], [...path, key], out);
    }
  }
  return out;
}

export interface CorrectionRequestBody {
  reason: string;
  [section: string]: unknown;
}

/**
 * Builds the PATCH body from the form's dirty state.
 *
 * `titles` (the land-title repeater) becomes `landTitles`, and every touched row re-attaches
 * its `titleId` from the current values — the backend matches rows by id and rejects an
 * unknown one, so a row must never be sent without it.
 */
export function buildCorrectionRequest(
  typeCode: string,
  reason: string,
  dirtyFields: Record<string, unknown>,
  values: Record<string, unknown>,
  defaults?: Record<string, unknown>,
): CorrectionRequestBody {
  const sections = sectionsForType(typeCode);
  const body: CorrectionRequestBody = { reason };

  const titleRows = new Map<number, Record<string, unknown>>();

  for (const { path, value } of dirtyLeaves(dirtyFields, values)) {
    const [head, ...rest] = path;

    // Land titles: titles.<index>.<field>
    if (head === 'titles' && rest.length === 2) {
      const [indexText, field] = rest;
      const index = Number(indexText);
      // Filter against the DTO the way the top-level path does. Without it a field that is
      // dirty but not a correction member — an area column coerced by the modal, say — rides
      // onto the wire and shows up as a phantom row in the confirm dialog.
      if (!DTO_MEMBERS.landTitle.includes(field as never)) continue;
      if (!titleRows.has(index)) titleRows.set(index, {});
      titleRows.get(index)![field] = value;
      continue;
    }

    // Lease block is already nested under its own prefix.
    if (head === 'leaseAgreement' && rest.length === 1) {
      if (!sections.includes('leaseAgreement')) continue;
      const target = (body.leaseAgreement ??= {}) as Record<string, unknown>;
      target[rest[0]] = value;
      continue;
    }

    if (rest.length > 0) continue; // nested blocks we don't correct (rentalInfo, areaDetails…)

    const section = sectionFor(head, sections);
    if (!section) continue; // not part of any correction DTO — the API would drop it

    const target = (body[section] ??= {}) as Record<string, unknown>;
    target[TO_DTO_NAME[head] ?? head] = value;
  }

  if (titleRows.size > 0) {
    // Prefer the seeded defaults for the id. The row in `values` has been through the edit
    // modal's zod schema, which strips keys it does not declare — and `id` is not a field
    // config. Reading it from the record instead means a row can never go out unidentified,
    // which is what made corrections vanish with a success toast.
    const original = (defaults?.titles ?? []) as Array<Record<string, unknown>>;
    const rows = (values.titles ?? []) as Array<Record<string, unknown>>;
    body.landTitles = [...titleRows.entries()]
      .map(([index, changed]) => {
        const titleId =
          original[index]?.id ??
          original[index]?.titleId ??
          rows[index]?.id ??
          rows[index]?.titleId;
        return titleId ? { titleId, ...changed } : null;
      })
      .filter(Boolean);
  }

  return body;
}

/** True when the user edited something other than the reason. */
export function hasRealChanges(body: CorrectionRequestBody): boolean {
  return Object.keys(body).some(k => k !== 'reason');
}
