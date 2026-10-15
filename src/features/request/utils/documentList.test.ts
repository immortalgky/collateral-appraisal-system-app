import { describe, expect, it } from 'vitest';
import type { UploadedDocument } from '../types/document';
import {
  alwaysShowType,
  CHIPS_WHEN_FOLDED,
  fileKind,
  filterRows,
  groupByType,
  isFollowUp,
  kpis,
  sectionStats,
  visibleFiles,
  withTypeRow,
  type ListQuery,
  type TypeRow,
} from './documentList';

const doc = (over: Partial<UploadedDocument>): UploadedDocument => ({
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
const file = (type: string, name: string, over: Partial<UploadedDocument> = {}) =>
  doc({ documentType: type, fileName: name, documentId: name, ...over });

const all: ListQuery = { query: '', filter: 'all' };
const name = (r: TypeRow) => r.displayName ?? r.documentType;

describe('groupByType', () => {
  it('folds the rows of a type into one row with its files and its empty slot', () => {
    const rows = groupByType([
      file('D036', 'p1.pdf', { isRequired: true }),
      file('D036', 'p2.pdf', { isRequired: true }),
      doc({ documentType: 'D015', displayName: 'ID card' }),
    ]);
    expect(rows.map(r => r.documentType)).toEqual(['D036', 'D015']);
    expect(rows[0]).toMatchObject({ required: true, status: 'ok', slot: null });
    expect(rows[0].files.map(f => f.fileName)).toEqual(['p1.pdf', 'p2.pdf']);
    expect(rows[1]).toMatchObject({ displayName: 'ID card', status: 'empty', files: [] });
    expect(rows[1].slot).not.toBeNull();
  });

  it('marks a required type with no file as missing, and one that still has a file as ok', () => {
    const [missing] = groupByType([doc({ documentType: 'D013', isRequired: true })]);
    expect(missing.status).toBe('miss');
    const [ok] = groupByType([
      file('D013', 'a.pdf', { isRequired: true }),
      doc({ documentType: 'D013', isRequired: true }),
    ]);
    expect(ok.status).toBe('ok');
    expect(ok.slot).not.toBeNull();
  });

  it('does not offer a row that is still uploading as a slot', () => {
    const [row] = groupByType([
      doc({ documentType: 'D015', fileName: 'x.pdf', isUploading: true }),
    ]);
    expect(row.slot).toBeNull();
  });
});

describe('filterRows', () => {
  const rows = groupByType([
    file('D036', 'summary.pdf', { isRequired: true }),
    file('D015', 'id-card.png', { source: 'FOLLOWUP' }),
    doc({ documentType: 'D013', isRequired: true }),
    doc({ documentType: 'D016' }),
    doc({ documentType: 'D014' }),
  ]);

  it('always collapses empty optional types, and always shows a missing required one', () => {
    const { shown, hidden } = filterRows(rows, all, name);
    expect(shown.map(r => r.documentType)).toEqual(['D036', 'D015', 'D013']);
    expect(hidden.map(r => r.documentType)).toEqual(['D016', 'D014']);
  });

  it('filters to what is still missing, or to files an appraiser asked for', () => {
    expect(
      filterRows(rows, { ...all, filter: 'miss' }, name).shown.map(r => r.documentType),
    ).toEqual(['D013']);
    expect(
      filterRows(rows, { ...all, filter: 'followup' }, name).shown.map(r => r.documentType),
    ).toEqual(['D015']);
  });

  it('searches the type name, the code and the file names, and then shows empty types too', () => {
    expect(
      filterRows(rows, { ...all, query: 'id-card' }, name).shown.map(r => r.documentType),
    ).toEqual(['D015']);
    expect(
      filterRows(rows, { ...all, query: 'd016' }, name).shown.map(r => r.documentType),
    ).toEqual(['D016']);
  });
});

describe('sectionStats and kpis', () => {
  const request = groupByType([
    file('D036', 'p1.pdf', { isRequired: true }),
    file('D036', 'p2.pdf', { isRequired: true }),
    doc({ documentType: 'D015' }),
  ]);
  const title = groupByType([
    doc({ documentType: 'D013', isRequired: true }),
    file('D017', 'permit.pdf', { source: 'FOLLOWUP' }),
  ]);

  it('counts types, not files, for the required progress', () => {
    expect(sectionStats(request)).toEqual({ types: 2, filled: 1, required: 1, requiredDone: 1 });
    expect(sectionStats(title)).toEqual({ types: 2, filled: 1, required: 1, requiredDone: 0 });
  });

  it('adds the sections up for the card header', () => {
    expect(kpis([request, title])).toEqual({
      required: 2,
      requiredDone: 1,
      files: 3,
      followUps: 1,
    });
  });
});

describe('file helpers', () => {
  it('tells a pdf from an image from anything else', () => {
    expect(fileKind('a.PDF')).toBe('pdf');
    expect(fileKind('a.jpeg')).toBe('img');
    expect(fileKind('a.docx')).toBe('file');
    expect(fileKind(null)).toBe('file');
  });

  it('folds more than four chips into three and a count', () => {
    const files = ['1', '2', '3', '4', '5'].map(n => file('D010', `${n}.jpg`));
    expect(visibleFiles(files, false)).toHaveLength(CHIPS_WHEN_FOLDED);
    expect(visibleFiles(files, true)).toHaveLength(5);
    expect(visibleFiles(files.slice(0, 4), false)).toHaveLength(4);
  });

  it('reads a follow-up source whatever its case, as old rows carry it', () => {
    for (const source of ['FOLLOWUP', 'FollowUp', 'followup']) {
      expect(isFollowUp(doc({ source }))).toBe(true);
    }
    for (const source of ['REQUEST', 'Request', 'PREV', null, undefined]) {
      expect(isFollowUp(doc({ source }))).toBe(false);
    }
  });
});

describe('a type the list always offers', () => {
  const rows = groupByType([
    doc({ documentType: 'D013', isRequired: true }),
    doc({ documentType: 'D016' }),
  ]);
  const names = (list: TypeRow[]) => list.map(row => row.documentType);
  const split = (query = '') => filterRows(rows, { query, filter: 'all' }, row => row.documentType);

  it('adds an empty optional row at the end when no row holds the type', () => {
    const withLetter = withTypeRow(rows, 'D035');
    expect(names(withLetter)).toEqual(['D013', 'D016', 'D035']);
    expect(withLetter[2]).toMatchObject({
      required: false,
      files: [],
      slot: null,
      status: 'empty',
    });
  });

  it('leaves the rows as they are when a row already holds it', () => {
    expect(withTypeRow(rows, 'D016')).toBe(rows);
  });

  it('shows the type as a full row, in its own place, instead of folding it into the empty types', () => {
    const result = alwaysShowType(rows, split(), 'D016');
    expect(names(result.shown)).toEqual(['D013', 'D016']);
    expect(names(result.hidden)).toEqual([]);
    // the others still fold: only this type is exempt
    expect(names(alwaysShowType(rows, split(), 'D999').hidden)).toEqual(['D016']);
  });

  it('still leaves it out when a search does not match it', () => {
    const result = alwaysShowType(rows, split('D013'), 'D016');
    expect(names(result.shown)).toEqual(['D013']);
    expect(names(result.hidden)).toEqual([]);
  });
});
