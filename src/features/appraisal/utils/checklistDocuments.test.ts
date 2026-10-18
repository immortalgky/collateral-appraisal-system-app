import { describe, expect, it } from 'vitest';
import {
  appendixFileCount,
  appendixSection,
  missingRequiredTypes,
  requestSections,
  valuationSection,
} from './checklistDocuments';

const item = (over = {}) => ({
  id: 'i1',
  documentId: 'd1',
  documentType: 'D013',
  documentTypeName: 'Title deed',
  fileName: 'deed.pdf',
  filePath: null,
  notes: null,
  isRequired: true,
  uploadedBy: 'P1',
  uploadedByName: 'Pat',
  uploadedAt: '2026-10-05T08:00:00Z',
  ...over,
});
const section = (over = {}) => ({
  titleId: null,
  titleIdentifier: null,
  collateralType: null,
  collateralTypeName: null,
  sectionLabel: 'Application Documents',
  totalDocuments: 1,
  uploadedDocuments: 1,
  documents: [item()],
  ...over,
});
const response = (sections: unknown[]) =>
  ({ totalDocuments: 0, totalUploaded: 0, sections }) as never;

describe('requestSections', () => {
  it('puts the request level first and numbers the title sections from 0', () => {
    const sections = requestSections(
      response([
        section(),
        section({ titleId: 'a', sectionLabel: 'Title 1' }),
        section({ titleId: 'b', sectionLabel: null, collateralTypeName: 'Condo' }),
      ]),
      'Request level',
    );
    expect(sections.map(s => [s.key, s.kind, s.index, s.label])).toEqual([
      ['request', 'request', -1, 'Request level'],
      ['title-a', 'title', 0, 'Title 1'],
      ['title-b', 'title', 1, 'Condo'],
    ]);
  });

  it('names a title section with the label it is given, else the one the API sent', () => {
    const data = response([
      section(),
      section({ titleId: 'a', sectionLabel: 'Land · Title Number 1234' }),
      section({ titleId: 'b', sectionLabel: 'Land · Title Number 99' }),
    ]);
    const [, first, second] = requestSections(data, 'Request level', ['Title 1234 · Land (#1)']);
    expect(first.label).toBe('Title 1234 · Land (#1)');
    expect(second.label).toBe('Land · Title Number 99'); // no label given for this one
  });

  it('maps a file with its notes, source and size, and keeps an empty row empty', () => {
    const [request] = requestSections(
      response([
        section({
          documents: [
            item({ notes: 'blurry', source: 'FOLLOWUP', fileSizeBytes: 2048 }),
            item({ id: 'i2', documentId: null, fileName: null, documentType: 'D014' }),
          ],
        }),
      ]),
      'Request level',
    );
    expect(request.documents[0]).toMatchObject({
      id: 'i1',
      documentType: 'D013',
      displayName: 'Title deed',
      notes: 'blurry',
      source: 'FOLLOWUP',
      fileSizeBytes: 2048,
    });
    expect(request.documents[1]).toMatchObject({ fileName: null, isRequired: true, source: null });
  });

  it('counts the required types that still have no file, across sections', () => {
    const sections = requestSections(
      response([
        section({
          documents: [
            item({ documentId: null, fileName: null }),
            item({ id: 'i2', documentType: 'D014', isRequired: false, fileName: null }),
          ],
        }),
        section({ titleId: 'a', documents: [item({ id: 'i3' })] }),
      ]),
      'Request level',
    );
    expect(missingRequiredTypes(sections)).toBe(1);
    expect(missingRequiredTypes(requestSections(undefined, 'x'))).toBe(0);
  });
});

describe('valuationSection', () => {
  const type = (code: string, files: unknown[]) =>
    ({
      code,
      name: `Name ${code}`,
      nameTh: `ชื่อ ${code}`,
      category: 'VAL_DOC',
      totalFiles: files.length,
      files,
    }) as never;

  it('gives a type with files one row per file and a type without one an empty row', () => {
    const { documents } = valuationSection(
      [
        type('V1', [
          { id: 'f1', documentId: 'd1', fileName: 'a.pdf', notes: 'n', sortOrder: 1 },
          { id: 'f2', documentId: 'd2', fileName: 'b.pdf', sortOrder: 2 },
        ]),
        type('V2', []),
      ],
      'th',
      'Valuation',
    );
    expect(documents.map(d => [d.documentType, d.fileName, d.displayName])).toEqual([
      ['V1', 'a.pdf', 'ชื่อ V1'],
      ['V1', 'b.pdf', 'ชื่อ V1'],
      ['V2', null, 'ชื่อ V2'],
    ]);
    expect(documents[0].notes).toBe('n');
    expect(documents.every(d => !d.isRequired)).toBe(true);
  });

  it('falls back to the English name when the Thai name is blank', () => {
    const blank = {
      code: 'V1',
      name: 'Name V1',
      nameTh: '',
      category: 'VAL_DOC',
      totalFiles: 0,
      files: [],
    };
    const { documents } = valuationSection([blank as never], 'th', 'Valuation');
    expect(documents[0].displayName).toBe('Name V1');
  });

  it('uses the English name outside a Thai UI', () => {
    const { documents } = valuationSection([type('V1', [])], 'en', 'Valuation');
    expect(documents[0].displayName).toBe('Name V1');
  });
});

describe('appendixSection', () => {
  const appendix = (code: string, sortOrder: number, documents: unknown[], over = {}) =>
    ({
      id: `id-${code}`,
      appendixTypeCode: code,
      appendixTypeName: `Name ${code}`,
      sortOrder,
      layoutColumns: 2,
      documents,
      ...over,
    }) as never;
  const file = (id: string, displaySequence: number, fileName: string) => ({
    id,
    documentId: `doc-${id}`,
    displaySequence,
    fileName,
    mimeType: 'application/pdf',
    fileSizeBytes: 100,
  });

  it('makes a row per appendix type in sort order, its files in book order, and an empty row for a type with none', () => {
    const { documents } = appendixSection(
      [
        appendix('B', 2, []),
        appendix('A', 1, [file('f2', 2, 'two.pdf'), file('f1', 1, 'one.pdf')]),
      ],
      a => `Shown ${a.appendixTypeCode}`,
      'Appendix',
    );
    expect(documents.map(d => [d.documentType, d.fileName, d.displayName, d.id])).toEqual([
      ['A', 'one.pdf', 'Shown A', 'f1'],
      ['A', 'two.pdf', 'Shown A', 'f2'],
      ['B', null, 'Shown B', 'slot-id-B'],
    ]);
    expect(documents[0]).toMatchObject({ documentId: 'doc-f1', fileSizeBytes: 100 });
    expect(documents.every(d => !d.isRequired)).toBe(true);
  });
});

describe('appendixFileCount', () => {
  it('adds up the files of every appendix', () => {
    expect(
      appendixFileCount({
        items: [{ documents: [{}, {}] }, { documents: [] }, { documents: [{}] }],
      } as never),
    ).toBe(3);
    expect(appendixFileCount(undefined)).toBe(0);
  });
});
