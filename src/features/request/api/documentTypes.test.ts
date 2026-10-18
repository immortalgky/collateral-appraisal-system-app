import { describe, expect, it } from 'vitest';
import {
  documentTypeLabel,
  getDocumentTypeName,
  getDocumentTypeSearchText,
  type DocumentType,
} from './documentTypes';

const types: DocumentType[] = [
  { code: 'D013', name: 'Original Size Ownership Document', nameTh: 'เอกสารสิทธิ์ขนาดเท่าตัวจริง' },
  { code: 'D099', name: 'Other', nameTh: null },
  { code: 'D098', name: 'Blank Thai', nameTh: '' },
];

describe('document type names', () => {
  it('uses the Thai name when the UI is Thai, and the English name otherwise', () => {
    expect(getDocumentTypeName(types, 'D013', 'th')).toBe('เอกสารสิทธิ์ขนาดเท่าตัวจริง');
    expect(getDocumentTypeName(types, 'D013', 'th-TH')).toBe('เอกสารสิทธิ์ขนาดเท่าตัวจริง');
    expect(getDocumentTypeName(types, 'D013', 'en')).toBe('Original Size Ownership Document');
    expect(getDocumentTypeName(types, 'D013', 'zh')).toBe('Original Size Ownership Document');
  });

  it('falls back to the English name when there is no Thai one, and to the code when there is no type', () => {
    expect(getDocumentTypeName(types, 'D099', 'th')).toBe('Other');
    expect(getDocumentTypeName(types, 'D098', 'th')).toBe('Blank Thai');
    expect(getDocumentTypeName(types, 'D404', 'th')).toBe('D404');
    expect(documentTypeLabel({ code: 'X' }, 'th')).toBe('X');
  });

  it('gives both names to a search', () => {
    expect(getDocumentTypeSearchText(types, 'D013')).toBe(
      'Original Size Ownership Document เอกสารสิทธิ์ขนาดเท่าตัวจริง',
    );
    expect(getDocumentTypeSearchText(types, 'D099')).toBe('Other');
    expect(getDocumentTypeSearchText(types, 'D404')).toBe('');
  });
});
