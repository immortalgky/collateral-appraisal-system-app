import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const downloadBlob = vi.hoisted(() => vi.fn());
vi.mock('@shared/api/blobTransfer', () => ({ downloadBlob }));

import { useReportExport } from './operationalReportsApi';

const LAYOUT = { orientation: 'portrait', overflow: 'split', fontSize: 9 } as const;

async function sentParams(format: 'pdf' | 'xlsx', layout?: typeof LAYOUT, lang?: 'th' | 'en') {
  const { result } = renderHook(() => useReportExport('RCAS001', {}));
  await act(() => result.current.exportReport(format, lang, layout));
  return downloadBlob.mock.calls[0][1].params;
}

describe('useReportExport', () => {
  beforeEach(() => {
    downloadBlob.mockReset();
    downloadBlob.mockResolvedValue({ data: new Blob(['x']), headers: {} });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });

  it('sends the pdf layout params under the backend names', async () => {
    expect(await sentParams('pdf', LAYOUT, 'th')).toMatchObject({
      format: 'pdf',
      lang: 'th',
      orientation: 'portrait',
      overflow: 'split',
      fontSize: 9,
    });
  });

  it('sends no layout params for xlsx', async () => {
    const params = await sentParams('xlsx', LAYOUT, 'en');
    expect(params).toEqual({ format: 'xlsx', lang: 'en' });
  });
});
