import { describe, it, expect } from 'vitest';
import { getFileMeta } from './documentShared';

const UNTITLED = 'Untitled document';

describe('getFileMeta', () => {
  it('falls back to the untitled label for a missing or empty file name', () => {
    expect(getFileMeta({ fileName: null }, UNTITLED).name).toBe(UNTITLED);
    expect(getFileMeta({}, UNTITLED).name).toBe(UNTITLED);
    expect(getFileMeta({ fileName: '' }, UNTITLED).name).toBe(UNTITLED);
    expect(getFileMeta({ fileName: 'deed.pdf' }, UNTITLED).name).toBe('deed.pdf');
  });

  it('uses the uploader code when the name is missing or empty', () => {
    const base = { uploadedBy: 'bkk.staff1' };
    expect(getFileMeta({ ...base, uploadedByName: 'Anuwat' }, UNTITLED).uploadedBy).toBe('Anuwat');
    expect(getFileMeta({ ...base, uploadedByName: '' }, UNTITLED).uploadedBy).toBe('bkk.staff1');
    expect(getFileMeta({ ...base, uploadedByName: null }, UNTITLED).uploadedBy).toBe('bkk.staff1');
    expect(getFileMeta({ uploadedByName: '', uploadedBy: '' }, UNTITLED).uploadedBy).toBe('');
    expect(getFileMeta({}, UNTITLED).uploadedBy).toBe('');
  });

  it('gives no type label when there is nothing to derive one from', () => {
    expect(getFileMeta({ fileName: 'README' }, UNTITLED).typeLabel).toBe('');
    expect(getFileMeta({ fileName: 'memo' }, UNTITLED).typeLabel).toBe('');
    expect(getFileMeta({ fileName: null, mimeType: null }, UNTITLED).typeLabel).toBe('');
    // A bare name is not an extension: the mime type decides.
    expect(
      getFileMeta({ fileName: 'memo', fileExtension: '', mimeType: 'application/pdf' }, UNTITLED)
        .typeLabel,
    ).toBe('PDF');
    // An empty extension must not block the one in the name.
    expect(getFileMeta({ fileName: 'scan.jpg', fileExtension: '' }, UNTITLED).typeLabel).toBe(
      'JPG',
    );
  });

  it('reads the type, size and date of a full file', () => {
    const meta = getFileMeta(
      {
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
        uploadedAt: '2026-09-30T15:40:00',
      },
      UNTITLED,
    );
    expect(meta).toMatchObject({
      typeLabel: 'PDF',
      size: '2.0 KB',
      uploadedAt: '30/09/2026 15:40',
    });
  });

  it('leaves size and date empty when the file has none', () => {
    expect(getFileMeta({ fileName: 'a.pdf' }, UNTITLED)).toMatchObject({
      size: '',
      uploadedAt: '',
    });
  });
});
