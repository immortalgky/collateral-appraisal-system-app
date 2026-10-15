import { describe, expect, it } from 'vitest';
import type { UploadedDocument } from '../types/document';
import { mergeChecklistSlots } from './useRequiredDocuments';

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

const checklist = [
  { documentType: 'D036', displayName: 'Previous Summary', isRequired: true },
  { documentType: 'D013', displayName: 'Deed', isRequired: true },
  { documentType: 'D015', displayName: 'ID Card', isRequired: false },
];

describe('mergeChecklistSlots', () => {
  it('gives an empty section every checklist slot, required first', () => {
    const { docs, changed } = mergeChecklistSlots([], checklist);
    expect(changed).toBe(true);
    expect(docs.map(d => `${d.documentType}${d.isRequired ? '*' : ''}`)).toEqual([
      'D013*',
      'D036*',
      'D015',
    ]);
    expect(docs.every(d => !d.fileName)).toBe(true);
  });

  it('marks carried rows of a required type as required, and restores the slots around them', () => {
    // what is left of a section after a previous appraisal's files were put in: files only
    const carried = [
      row({ documentType: 'D036', documentId: 'a', fileName: 's1.pdf', source: 'PREV' }),
      row({ documentType: 'D005', documentId: 'b', fileName: 'aerial.pdf', source: 'PREV' }),
    ];
    const { docs } = mergeChecklistSlots(carried, checklist);
    const d036 = docs.filter(d => d.documentType === 'D036');
    expect(d036).toHaveLength(1);
    expect(d036[0]).toMatchObject({
      isRequired: true,
      fileName: 's1.pdf',
      displayName: 'Previous Summary',
    });
    // the required type that has no file still has its empty slot, and the optional one its chip
    expect(docs.find(d => d.documentType === 'D013')).toMatchObject({
      isRequired: true,
      fileName: null,
    });
    expect(docs.find(d => d.documentType === 'D015')).toMatchObject({
      isRequired: false,
      fileName: null,
    });
    // a file of a type outside the checklist stays as it is
    expect(docs.find(d => d.documentType === 'D005')).toMatchObject({ isRequired: false });
  });

  it('keeps a required slot after every file of its type was removed', () => {
    const { docs } = mergeChecklistSlots(
      [row({ documentType: 'D036', isRequired: true })],
      checklist,
    );
    expect(docs.find(d => d.documentType === 'D036')).toMatchObject({
      isRequired: true,
      fileName: null,
    });
  });

  it('reports no change once everything is in place', () => {
    const first = mergeChecklistSlots([], checklist).docs;
    expect(mergeChecklistSlots(first, checklist).changed).toBe(false);
  });
});
