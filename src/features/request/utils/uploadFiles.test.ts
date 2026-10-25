import { describe, expect, it } from 'vitest';
import type { UploadedDocument } from '../types/document';
import { placeInFlight, revertInFlight, splitUploadable, startInFlight } from './uploadFiles';

const file = (name: string, size = 10, type = '') => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('splitUploadable', () => {
  it('keeps pdf and images, by type or by extension, and names what it leaves out', () => {
    const { valid, skipped } = splitUploadable(
      [
        file('a.pdf', 10, 'application/pdf'),
        file('b.JPG'),
        file('c.png', 10, 'image/png'),
        file('d.exe'),
        file('e.pdf', 500),
      ],
      100,
    );
    expect(valid.map(f => f.name)).toEqual(['a.pdf', 'b.JPG', 'c.png']);
    expect(skipped.map(s => [s.file.name, s.reason])).toEqual([
      ['d.exe', 'type'],
      ['e.pdf', 'size'],
    ]);
  });
});

describe('an in-flight row: where it goes, and how it comes back', () => {
  const row = (over: Partial<UploadedDocument>): UploadedDocument => ({
    documentType: 'D035',
    fileName: null,
    uploadedAt: '2026-10-01T00:00:00',
    prefix: null,
    notes: null,
    filePath: null,
    createdWorkstation: null,
    isRequired: true,
    uploadedBy: null,
    uploadedByName: null,
    ...over,
  });
  const slot = row({ rowId: 'slot-1' });
  const temp = (rowId: string) => row({ rowId, fileName: 'x.pdf', isUploading: true });

  it("takes the empty slot over under the slot's own key, and gives it back on revert", () => {
    const docs = [row({ documentType: 'D015', rowId: 'a', fileName: 'a.pdf' }), slot];
    const flight = startInFlight(docs, slot);
    expect(flight).toEqual({ slot, key: 'slot-1' });
    const placed = placeInFlight(docs, flight, temp(flight.key));
    expect(placed.map(d => d.rowId)).toEqual(['a', 'slot-1']);
    expect(placed[1].fileName).toBe('x.pdf');
    expect(revertInFlight(placed, flight)).toEqual(docs);
  });

  it('with no slot, appends under a fresh key, and revert removes only that row', () => {
    const docs = [row({ rowId: 'a', fileName: 'a.pdf' })];
    const flight = startInFlight(docs, null);
    expect(flight.slot).toBeNull();
    expect(flight.key).not.toBe('a');
    const placed = placeInFlight(docs, flight, temp(flight.key));
    expect(placed).toHaveLength(2);
    expect(revertInFlight(placed, flight)).toEqual(docs);
  });

  it('when the slot has been filled by another upload, adds beside it under a key of its own', () => {
    // the slot's key now belongs to the upload that filled it: this row must not share it
    const filled = [row({ rowId: 'slot-1', fileName: 'other.pdf', isUploading: true })];
    const flight = startInFlight(filled, slot);
    expect(flight.slot).toBeNull();
    expect(flight.key).not.toBe('slot-1');

    const placed = placeInFlight(filled, flight, temp(flight.key));
    expect(placed.map(d => d.fileName)).toEqual(['other.pdf', 'x.pdf']);
    // rolling this row back leaves the other upload exactly as it was
    expect(revertInFlight(placed, flight)).toEqual(filled);
  });
});
