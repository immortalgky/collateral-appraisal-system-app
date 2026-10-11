import { describe, expect, it } from 'vitest';
import type { CarryForwardDocument } from '@/features/appraisal/api/priorAppraisal';
import type { UploadedDocument } from '../types/document';
import {
  applyCarryForward,
  buildTitleKeyIndex,
  carryEntryKey,
  clearFile,
  countCarriedFiles,
  countOwnFiles,
  deriveCarryForward,
  dropCarried,
  findTitleIndex,
  hasUploadingRows,
  formTitleKey,
  placeDocument,
  rehomeOwnFiles,
  removeFiles,
  restoreTarget,
  titleKey,
  toFormDocument,
  makeUploadedRow,
} from './carryForward';

const carried = (over: Partial<CarryForwardDocument>): CarryForwardDocument => ({
  documentId: 'doc-1',
  documentType: 'D015',
  suggestedType: 'D015',
  level: 'Request',
  titleId: null,
  collateralType: null,
  titleNumber: null,
  fileName: 'id-card.png',
  filePath: null,
  prefix: null,
  set: 1,
  notes: null,
  uploadedBy: 'u1',
  uploadedByName: 'User One',
  uploadedAt: '2026-08-24T08:06:00',
  defaultUse: true,
  ...over,
});

const row = (over: Partial<UploadedDocument>): UploadedDocument => ({
  documentType: 'D015',
  fileName: null,
  uploadedAt: '2026-10-05T00:00:00',
  prefix: null,
  notes: null,
  filePath: null,
  createdWorkstation: null,
  isRequired: false,
  uploadedBy: null,
  uploadedByName: null,
  ...over,
});

// A row holding a file that was taken from the previous appraisal.
const prevRow = (over: Partial<UploadedDocument>): UploadedDocument =>
  row({ source: 'PREV', fileName: 'f.pdf', ...over });

// A title-level endpoint entry, and the matching title in the form: both are keyed by collateral
// type + number, never by the prior title id.
const titleEntry = (num: string, over: Partial<CarryForwardDocument> = {}) =>
  carried({
    level: 'Title',
    collateralType: '01',
    titleNumber: num,
    titleId: `prior-${num}`,
    ...over,
  });
const formTitle = (num: string, documents: UploadedDocument[] = [], over = {}) => ({
  id: `new-${num}`,
  collateralType: '01',
  titleNumber: num,
  documents,
  ...over,
});

describe('deriveCarryForward', () => {
  const files = [
    carried({ documentId: 'a' }),
    carried({ documentId: 'b' }),
    carried({ documentId: 'c' }),
  ];

  it('derives used and unused from the carried rows in the form', () => {
    const { used, unused } = deriveCarryForward(
      files,
      [prevRow({ documentId: 'a' }), row({ documentId: 'x', fileName: 'x.pdf' })],
      [],
    );
    expect(used.map(d => d.documentId)).toEqual(['a']);
    expect(unused.map(d => d.documentId)).toEqual(['b', 'c']);
  });

  it('treats a file removed from the form as unused again, so it can be restored', () => {
    const documents = [prevRow({ documentId: 'a' })];
    const entries = [carried({ documentId: 'a' }), titleEntry('1', { documentId: 'b' })];
    expect(
      deriveCarryForward(entries, documents, [formTitle('1', [prevRow({ documentId: 'b' })])])
        .unused,
    ).toEqual([]);
    expect(
      deriveCarryForward(entries, documents, [formTitle('1')]).unused.map(d => d.documentId),
    ).toEqual(['b']);
  });

  it('is section-aware when one DocumentId comes back at request level and on two titles', () => {
    const entries = [
      carried({ documentId: 'same' }),
      titleEntry('1', { documentId: 'same' }),
      titleEntry('2', { documentId: 'same' }),
    ];
    // Only title 1 holds the file: the request-level entry and title 2's entry are still unused.
    const { used, unused } = deriveCarryForward(
      entries,
      [],
      [formTitle('1', [prevRow({ documentId: 'same' })]), formTitle('2')],
    );
    expect(used.map(carryEntryKey)).toEqual(['same|Title|prior-1']);
    expect(unused.map(carryEntryKey)).toEqual(['same|Request|', 'same|Title|prior-2']);
    expect(new Set(entries.map(carryEntryKey)).size).toBe(3);
  });

  it('counts a title file the maker moved to request level as used, and not restorable twice', () => {
    const entries = [titleEntry('1', { documentId: 'a' })];
    const { used, unused } = deriveCarryForward(
      entries,
      [prevRow({ documentId: 'a' })],
      [formTitle('1')],
    );
    expect(used).toHaveLength(1);
    expect(unused).toEqual([]);
  });

  it('lets a moved row serve only one of several entries with the same DocumentId', () => {
    // 'same' is carried at request level and on t1. The maker moved the t1 copy to request level
    // too, so the form holds two rows at request level: both entries are used.
    const both = deriveCarryForward(
      [carried({ documentId: 'same' }), titleEntry('1', { documentId: 'same' })],
      [prevRow({ documentId: 'same' }), prevRow({ documentId: 'same' })],
      [formTitle('1')],
    );
    expect(both.unused).toEqual([]);

    // With one row only, one entry stays unused instead of both counting it.
    const one = deriveCarryForward(
      [carried({ documentId: 'same' }), titleEntry('1', { documentId: 'same' })],
      [prevRow({ documentId: 'same' })],
      [formTitle('1')],
    );
    expect(one.used.map(carryEntryKey)).toEqual(['same|Request|']);
    expect(one.unused.map(carryEntryKey)).toEqual(['same|Title|prior-1']);
  });

  it('keeps an entry unused when no row anywhere holds its file', () => {
    const { used, unused } = deriveCarryForward(
      [titleEntry('gone', { documentId: 'a' })],
      [row({ documentId: 'other', fileName: 'o.pdf' })],
      [formTitle('1')],
    );
    expect(used).toEqual([]);
    expect(unused).toHaveLength(1);
  });
});

describe('titleKey', () => {
  it('is the collateral type plus its number, trimmed and case-insensitive', () => {
    expect(titleKey(' 01 ', ' ฉ-123 ')).toBe(titleKey('01', 'ฉ-123'));
    expect(titleKey('10', 'ab 1234')).toBe(titleKey('10', 'AB 1234'));
  });

  it("compares a condominium's list of land titles tidied, so a reformatted list matches", () => {
    expect(titleKey('08', '1234,1235;  1236-1250')).toBe(
      titleKey('08', '1234, 1235, 1236 - 1250 '),
    );
    expect(titleKey('08', '1234, 1234, 1235')).toBe(titleKey('08', '1234 1235'));
    expect(titleKey('08', '1234, 1235')).not.toBe(titleKey('08', '1235, 1234'));
    // only a condominium's number is a list: a land title keeps its text as it is
    expect(titleKey('01', '1234,1235')).not.toBe(titleKey('01', '1234, 1235'));
  });

  it("reads a condominium's Thai numerals as digits, and keys text without a number by itself", () => {
    expect(titleKey('08', '๑๒๓๔,๑๒๓๕')).toBe(titleKey('08', '1234, 1235'));
    expect(titleKey('08', ' ก-ข ')).toBe(titleKey('08', 'ก-ข'));
    expect(titleKey('08', 'ก-ข')).not.toBeNull();
  });

  it('is null when the type or the number is missing', () => {
    expect(titleKey(null, '123')).toBeNull();
    expect(titleKey('01', '  ')).toBeNull();
  });

  it('reads each collateral type from its own number field on a title in the form', () => {
    expect(formTitleKey({ collateralType: '10', licensePlateNumber: 'AB 1' })).toBe(
      titleKey('10', 'AB 1'),
    );
    expect(
      formTitleKey({ collateralType: '11', registrationStatus: true, registrationNumber: 'M-9' }),
    ).toBe(titleKey('11', 'M-9'));
    expect(formTitleKey({ collateralType: '12', vesselRegistrationNumber: 'V-7' })).toBe(
      titleKey('12', 'V-7'),
    );
    expect(formTitleKey({ collateralType: '01', titleNumber: '12345' })).toBe(
      titleKey('01', '12345'),
    );
    // a plate on a land title proves nothing
    expect(formTitleKey({ collateralType: '01', licensePlateNumber: 'AB 1' })).toBeNull();
  });
});

describe('findTitleIndex', () => {
  const titles = [formTitle('12345'), formTitle('12346')];

  it('matches the only title with the entry key, whatever the title ids are', () => {
    expect(findTitleIndex(titles, titleEntry('12346', { titleId: 'unrelated' }))).toBe(1);
  });

  it('never matches by the prior title id', () => {
    const noNumber = titleEntry('12346', { titleNumber: null, titleId: titles[1].id });
    expect(findTitleIndex(titles, noNumber)).toBe(-1);
  });

  it('keeps the same number under different collateral types apart', () => {
    const mixed = [
      formTitle('777', [], { collateralType: '01' }),
      formTitle('777', [], {
        collateralType: '11',
        registrationNumber: '777',
        registrationStatus: true,
        titleNumber: null,
      }),
    ];
    expect(findTitleIndex(mixed, titleEntry('777', { collateralType: '11' }))).toBe(1);
    expect(findTitleIndex(mixed, titleEntry('777', { collateralType: '01' }))).toBe(0);
  });

  it('does not guess between two titles that share a key', () => {
    const dup = [formTitle('12345'), formTitle('12345', [], { id: 'other' })];
    expect(findTitleIndex(dup, titleEntry('12345'))).toBe(-1);
  });

  it('is -1 for a request-level file or a title that is not in the request', () => {
    expect(findTitleIndex(titles, carried({ level: 'Request' }))).toBe(-1);
    expect(findTitleIndex(titles, titleEntry('99999'))).toBe(-1);
  });
});

describe('buildTitleKeyIndex', () => {
  it('lists the titles under each key once, and gives the same answers as the plain lookup', () => {
    const titles = [formTitle('1'), formTitle('2'), formTitle('1', [], { id: 'dup' })];
    const index = buildTitleKeyIndex(titles);
    expect(index.get('01|1')).toEqual([0, 2]);
    expect(index.get('01|2')).toEqual([1]);
    for (const num of ['1', '2', '9']) {
      const entry = titleEntry(num);
      expect(findTitleIndex(titles, entry, index)).toBe(findTitleIndex(titles, entry));
    }
    expect(findTitleIndex(titles, titleEntry('2'), index)).toBe(1);
    expect(findTitleIndex(titles, titleEntry('1'), index)).toBe(-1);
  });
});

describe('restoreTarget', () => {
  it('goes to request level for a request file, and to the one title with the key', () => {
    const titles = [formTitle('1'), formTitle('2')];
    expect(restoreTarget(titles, carried({}))).toEqual({ entityType: 'request', entityIndex: -1 });
    expect(restoreTarget(titles, titleEntry('2'))).toEqual({ entityType: 'title', entityIndex: 1 });
  });

  it('asks the maker (null) when no title, or more than one, has the key', () => {
    expect(restoreTarget([formTitle('1')], titleEntry('9'))).toBeNull();
    expect(
      restoreTarget([formTitle('1'), formTitle('1', [], { id: 'b' })], titleEntry('1')),
    ).toBeNull();
  });

  it('places a chosen section as a PREV row, filling the type slot there else appending', () => {
    const entry = titleEntry('9', { documentType: 'D013', suggestedType: 'D013' });
    const slot = row({ documentType: 'D013', isRequired: true });
    const [filled] = placeDocument([slot], toFormDocument(entry, 'new-3'));
    expect(filled).toMatchObject({ source: 'PREV', titleId: 'new-3', isRequired: true });
    const appended = placeDocument([], toFormDocument(entry, 'new-3'));
    expect(appended).toHaveLength(1);
    expect(appended[0].source).toBe('PREV');
  });
});

describe('placeDocument', () => {
  it('fills the empty slot of the same type and keeps its required flag', () => {
    const slot = row({ documentType: 'D036', isRequired: true, displayName: 'Prev summary' });
    const out = placeDocument(
      [row({ documentType: 'D015', fileName: 'x.png' }), slot],
      row({ documentType: 'D036', documentId: 'a', fileName: 'sum.pdf' }),
    );
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({
      documentId: 'a',
      isRequired: true,
      displayName: 'Prev summary',
    });
  });

  it('keeps the slot\u2019s persisted id and rowId so a draft save updates the row', () => {
    const slot = row({ documentType: 'D036', id: 'row-9', rowId: 'k-9', isRequired: true });
    const [filled] = placeDocument(
      [slot],
      row({ documentType: 'D036', id: null, rowId: 'fresh', documentId: 'a', fileName: 's.pdf' }),
    );
    expect(filled).toMatchObject({ id: 'row-9', rowId: 'k-9', documentId: 'a' });
  });

  it('adds a row when the type has no empty slot, so split files coexist', () => {
    const first = row({ documentType: 'D036', documentId: 'a', fileName: 'p1.pdf' });
    const out = placeDocument(
      [first],
      row({ documentType: 'D036', documentId: 'b', fileName: 'p2.pdf' }),
    );
    expect(out.map(d => d.documentId)).toEqual(['a', 'b']);
  });
});

describe('applyCarryForward', () => {
  const titles = [formTitle('1'), formTitle('2')];

  it('puts request files at request level and title files into the matching title', () => {
    const out = applyCarryForward([], titles, [
      carried({ documentId: 'r', documentType: 'D043', suggestedType: 'D036' }),
      titleEntry('2', { documentId: 'x', documentType: 'D013', suggestedType: 'D013' }),
    ]);
    expect(out.documents.map(d => d.documentId)).toEqual(['r']);
    expect(out.titles[0].documents).toEqual([]);
    expect(out.titles[1].documents?.[0]).toMatchObject({ documentId: 'x', titleId: 'new-2' });
  });

  it('types the row by suggestedType, not by the file\u2019s own code (a summary report is D036)', () => {
    const out = applyCarryForward([], titles, [
      carried({ documentId: 'r', documentType: 'D042', suggestedType: 'D036' }),
    ]);
    expect(out.documents[0]).toMatchObject({ documentId: 'r', documentType: 'D036' });
    expect(toFormDocument(carried({ documentType: 'D043', suggestedType: 'D036' }))).toMatchObject({
      documentType: 'D036',
    });
  });

  it('a defaultUse=false file is not added and lands in the unused list, the rest are used', () => {
    const entries = [
      carried({ documentId: 'use', defaultUse: true }),
      carried({ documentId: 'skip', defaultUse: false }),
    ];
    const out = applyCarryForward([], titles, entries);
    expect(out.documents.map(d => d.documentId)).toEqual(['use']);
    const { used, unused } = deriveCarryForward(entries, out.documents, out.titles);
    expect(used.map(d => d.documentId)).toEqual(['use']);
    expect(unused.map(d => d.documentId)).toEqual(['skip']);
  });

  it('leaves defaultUse=false files and unmatched titles out of the form', () => {
    const out = applyCarryForward([], titles, [
      carried({ documentId: 'n', defaultUse: false }),
      titleEntry('nope', { documentId: 'm' }),
    ]);
    expect(out.documents).toEqual([]);
    expect(out.titles.every(t => t.documents?.length === 0)).toBe(true);
  });

  it('does not place a title file when two titles share its key', () => {
    const out = applyCarryForward(
      [],
      [formTitle('1'), formTitle('1', [], { id: 'b' })],
      [titleEntry('1', { documentId: 'd' })],
    );
    expect(out.titles.every(t => t.documents.length === 0)).toBe(true);
  });
});

describe('toFormDocument / clearFile', () => {
  it('stamps the PREV source on a carried row, and clearing a slot drops it', () => {
    const doc = toFormDocument(carried({ documentId: 'a' }));
    expect(doc.source).toBe('PREV');
    expect(clearFile(doc)).toMatchObject({ source: null, documentId: null, fileName: null });
  });

  it('also forgets the notes and prefix of the file it removes', () => {
    const cleared = clearFile(
      row({ fileName: 'a.pdf', documentId: 'a', notes: 'check page 2', prefix: 'ฉ' }),
    );
    expect(cleared).toMatchObject({ notes: null, prefix: null });
  });

  it('keeps the source through a move (the row is spread, not rebuilt)', () => {
    const doc = toFormDocument(carried({ documentId: 'a' }));
    expect({ ...doc, id: null, titleId: 't9' }.source).toBe('PREV');
  });
});

describe('hasUploadingRows', () => {
  it('sees an upload in progress at request level or on a title', () => {
    expect(hasUploadingRows([row({ isUploading: true })], [])).toBe(true);
    expect(hasUploadingRows([], [{ documents: [row({ isUploading: true })] }])).toBe(true);
    expect(hasUploadingRows([row({})], [{ documents: [row({})] }])).toBe(false);
  });
});

describe('applyCarryForward with files already in the form', () => {
  it('skips a file whose DocumentId is already there, whatever its source', () => {
    const out = applyCarryForward(
      [row({ documentId: 'a', fileName: 'a.pdf', source: 'REQUEST' })],
      [formTitle('1', [row({ documentId: 'b', fileName: 'b.pdf' })])],
      [
        carried({ documentId: 'a' }),
        titleEntry('1', { documentId: 'b' }),
        carried({ documentId: 'c' }),
      ],
    );
    expect(out.documents.map(d => d.documentId)).toEqual(['a', 'c']);
    expect(out.titles[0].documents.map(d => d.documentId)).toEqual(['b']);
  });

  it('still adds one DocumentId at both levels when neither is in the form yet', () => {
    const out = applyCarryForward(
      [],
      [formTitle('1')],
      [carried({ documentId: 'same' }), titleEntry('1', { documentId: 'same' })],
    );
    expect(out.documents).toHaveLength(1);
    expect(out.titles[0].documents).toHaveLength(1);
  });

  it('adds the title copy of a file when a legacy draft holds only its request-level copy', () => {
    const out = applyCarryForward(
      [row({ documentId: 'same', fileName: 'f.pdf', source: 'REQUEST' })],
      [formTitle('1')],
      [carried({ documentId: 'same' }), titleEntry('1', { documentId: 'same' })],
    );
    // the request-level entry is already there; the title's own is not, so only that one is added
    expect(out.documents).toHaveLength(1);
    expect(out.titles[0].documents.map(d => d.documentId)).toEqual(['same']);
  });

  it('adds a file once per section in one pass, however many times the list repeats it', () => {
    const out = applyCarryForward(
      [],
      [formTitle('1')],
      [
        carried({ documentId: 'dup' }),
        carried({ documentId: 'dup' }),
        titleEntry('1', { documentId: 'dup' }),
        titleEntry('1', { documentId: 'dup' }),
      ],
    );
    expect(out.documents).toHaveLength(1);
    expect(out.titles[0].documents).toHaveLength(1);
  });

  it('agrees with deriveCarryForward about what is in the form after adding', () => {
    const entries = [carried({ documentId: 'r' }), titleEntry('1', { documentId: 't' })];
    const out = applyCarryForward([], [formTitle('1')], entries);
    expect(deriveCarryForward(entries, out.documents, out.titles).unused).toEqual([]);
  });
});

describe('removeFiles', () => {
  const d036 = (over: Partial<UploadedDocument>) =>
    row({ documentType: 'D036', isRequired: true, ...over });

  it('turns the only row of a required type into the empty slot', () => {
    const out = removeFiles(
      [d036({ documentId: 'a', fileName: 'a.pdf' })],
      d => d.documentId === 'a',
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ fileName: null, documentId: null, isRequired: true });
  });

  it('removes a required row outright while another row of the type still holds a file', () => {
    const out = removeFiles(
      [
        d036({ documentId: 'a', fileName: 'p1.pdf' }),
        d036({ documentId: 'b', fileName: 'p2.pdf' }),
      ],
      d => d.documentId === 'a',
    );
    expect(out.map(d => d.documentId)).toEqual(['b']);
  });

  it('leaves one empty slot when every row of a required type goes', () => {
    const out = removeFiles(
      [
        d036({ documentId: 'a', fileName: 'p1.pdf' }),
        d036({ documentId: 'b', fileName: 'p2.pdf' }),
      ],
      () => true,
    );
    expect(out).toHaveLength(1);
    expect(out[0].fileName).toBeNull();
  });

  it('drops split carried files without leaving a required slot behind', () => {
    const out = dropCarried(
      [
        prevRow({ documentId: 'a', documentType: 'D036', isRequired: true }),
        row({ documentId: 'own', documentType: 'D036', isRequired: true, fileName: 'mine.pdf' }),
      ],
      [],
    );
    expect(out.documents.map(d => d.documentId)).toEqual(['own']);
  });
});

describe('dropCarried', () => {
  it('removes an optional carried row, empties a required one and keeps own files', () => {
    const out = dropCarried(
      [
        prevRow({ documentId: 'c-opt' }),
        prevRow({ documentId: 'c-req', documentType: 'D036', isRequired: true }),
        row({ documentId: 'own', fileName: 'mine.pdf' }),
      ],
      [],
    );
    expect(out.documents).toHaveLength(2);
    expect(out.documents[0]).toMatchObject({
      documentType: 'D036',
      fileName: null,
      documentId: null,
      source: null,
    });
    expect(out.documents[1].documentId).toBe('own');
  });
});

describe('own files across a change of previous appraisal', () => {
  const oldTitles = [
    {
      id: 'old-1',
      collateralType: '01',
      titleNumber: '111',
      documents: [
        prevRow({ documentId: 'c1', fileName: 'carried.pdf' }),
        row({ documentId: 'own-a', fileName: 'mine-a.pdf' }),
        row({ fileName: null }),
      ],
    },
    {
      id: 'old-2',
      collateralType: '01',
      titleNumber: '222',
      documents: [row({ documentId: 'own-b', fileName: 'mine-b.pdf', isRequired: true })],
    },
  ];

  it('counts only files the maker uploaded', () => {
    const own = countOwnFiles([row({ documentId: 'own-r', fileName: 'r.pdf' })], oldTitles);
    expect(own).toBe(3);
    expect(countCarriedFiles([], oldTitles)).toBe(1);
  });

  it('moves them to the new title with the same number, else up to the request level', () => {
    const out = rehomeOwnFiles(oldTitles, [
      { id: 'new-1', collateralType: '01', titleNumber: '111' },
      { id: 'new-9', collateralType: '01', titleNumber: '999' },
    ]);
    expect(out.titleDocuments[0].map(d => d.documentId)).toEqual(['own-a']);
    expect(out.titleDocuments[0][0].titleId).toBe('new-1');
    expect(out.titleDocuments[1]).toEqual([]);
    expect(out.requestDocuments.map(d => d.documentId)).toEqual(['own-b']);
    expect(out.requestDocuments[0].isRequired).toBe(false);
  });
});

describe('makeUploadedRow', () => {
  it("stamps what every upload path needs: the maker's own source, and a row key of its own", () => {
    const a = makeUploadedRow({ documentType: 'D015', fileName: 'a.pdf' });
    const b = makeUploadedRow({ documentType: 'D015', fileName: 'b.pdf' });
    expect(a).toMatchObject({ source: 'REQUEST', isRequired: false, id: null, titleId: null });
    expect(a.rowId).toBeTruthy();
    expect(a.rowId).not.toBe(b.rowId);
  });

  it('lets a path override any default, the row key included', () => {
    expect(
      makeUploadedRow({
        documentType: 'D013',
        fileName: 'x.pdf',
        rowId: 'fixed',
        isRequired: true,
      }),
    ).toMatchObject({ rowId: 'fixed', isRequired: true, source: 'REQUEST' });
  });
});
