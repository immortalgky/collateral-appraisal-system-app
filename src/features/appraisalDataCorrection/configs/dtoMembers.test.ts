import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DTO_MEMBERS } from './dtoMembers';

/**
 * `dtoMembers.ts` is generated from the backend record and drives which section each form field
 * is routed to. When the two drift, `buildCorrectionRequest` finds no section for the field and
 * drops it — the save succeeds, the admin sees a success toast, and the correction never
 * happened. Silent, so it gets a test rather than a comment.
 *
 * The C# file lives in the sibling API repo. When it isn't checked out the test skips rather
 * than fails: a frontend-only clone should still have a green suite.
 */
const CS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../collateral-appraisal-system-api',
  'Modules/Appraisal/Appraisal/Domain/Appraisals/PropertyCorrectionData.cs',
);

const RECORD_TO_SECTION: Record<string, keyof typeof DTO_MEMBERS> = {
  LandCorrection: 'land',
  LandTitleCorrection: 'landTitle',
  BuildingCorrection: 'building',
  CondoCorrection: 'condo',
  VehicleCorrection: 'vehicle',
  VesselCorrection: 'vessel',
  MachineryCorrection: 'machinery',
  LeaseAgreementCorrection: 'leaseAgreement',
};

const camel = (s: string) => s[0].toLowerCase() + s.slice(1);

function parseRecords(source: string): Record<string, string[]> {
  const lines = source.split('\n');
  const starts: Array<{ index: number; name: string }> = [];
  lines.forEach((line, index) => {
    const match = /^public sealed record (\w+)\(/.exec(line);
    if (match) starts.push({ index, name: match[1] });
  });

  const parsed: Record<string, string[]> = {};
  starts.forEach(({ index, name }, i) => {
    const end = starts[i + 1]?.index ?? lines.length;
    const members: string[] = [];
    for (const line of lines.slice(index + 1, end)) {
      // "string? OwnerName = null," / "Guid TitleId," / "string? Remark = null);"
      const match = /^\s*[\w<>?.[\], ]+?\s+(\w+)\s*(?:=\s*(?:null|true|false)\s*)?[,)];?\s*$/.exec(
        line,
      );
      // TitleId identifies the row rather than being correctable data.
      if (match && match[1] !== 'TitleId') members.push(camel(match[1]));
    }
    parsed[name] = members;
  });
  return parsed;
}

describe('DTO_MEMBERS', () => {
  const available = existsSync(CS_PATH);
  const parsed = available ? parseRecords(readFileSync(CS_PATH, 'utf-8')) : {};

  for (const [record, section] of Object.entries(RECORD_TO_SECTION)) {
    it.skipIf(!available)(`matches ${record}`, () => {
      expect({ section, members: [...DTO_MEMBERS[section]] }).toEqual({
        section,
        members: parsed[record],
      });
    });
  }
});
