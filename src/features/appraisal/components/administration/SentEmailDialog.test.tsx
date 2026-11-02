import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import SentEmailDialog from './SentEmailDialog';

/** "View sent": the email as it went out, with its files open- and download-able. The test i18n returns keys. */

const doc = vi.hoisted(() => ({
  view: vi.fn(),
  fetch: vi.fn(),
  save: vi.fn(),
}));
vi.mock('@/features/request/api/documents', () => ({
  useViewDocument: () => doc.view,
  useDownloadDocument: () => ({ mutateAsync: doc.fetch }),
}));
vi.mock('@/shared/utils/saveBlob', () => ({ saveBlob: doc.save }));

const sent = {
  id: 'e1',
  status: 'Sent',
  sentAt: '2026-10-29T14:33:00',
  sentTo: ['co@example.com'],
  sentCc: [],
  extraTo: [],
  cc: [],
  subject: 'ขอนำส่งงานประเมิน',
  bodyHtml: '<p>เรียน บริษัท</p>',
  attachments: [
    { documentId: 'd-map', source: 'appraisal', fileName: 'แผนที่.jpg', fileSizeBytes: 2048 },
    { documentId: 'd-bare', source: 'upload', fileName: null, fileSizeBytes: null },
  ],
};

beforeEach(() => {
  doc.view.mockReset();
  doc.fetch.mockReset().mockResolvedValue({ blob: new Blob(['x']), fileName: null });
  doc.save.mockReset();
  server.use(http.get('*/appraisals/:id/assignment-emails/e1', () => HttpResponse.json(sent)));
});

const renderDialog = () =>
  render(<SentEmailDialog appraisalId="A1" emailId="e1" onClose={vi.fn()} />);

describe('SentEmailDialog', () => {
  it('opens an attachment from its name and downloads it from the icon', async () => {
    const { user } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'แผนที่.jpg' }));
    expect(doc.view).toHaveBeenCalledWith('d-map', 2048, 'แผนที่.jpg');

    await user.click(
      screen.getAllByRole('button', { name: 'administration.email.view.download' })[0],
    );
    expect(doc.fetch).toHaveBeenCalledWith('d-map');
    await vi.waitFor(() => expect(doc.save).toHaveBeenCalledWith(expect.any(Blob), 'แผนที่.jpg'));
  });

  it('still lists a file with no name, by its document id', async () => {
    const { user } = renderDialog();

    await user.click(await screen.findByRole('button', { name: 'd-bare' }));

    expect(doc.view).toHaveBeenCalledWith('d-bare', null, null);
  });

  it('names a file that has no name "attachment" with the extension its type implies, not its id', async () => {
    doc.fetch.mockResolvedValue({
      blob: new Blob(['x'], { type: 'application/pdf' }),
      fileName: null,
    });
    const { user } = renderDialog();
    await screen.findByRole('button', { name: 'd-bare' });

    await user.click(
      screen.getAllByRole('button', { name: 'administration.email.view.download' })[1],
    );

    await vi.waitFor(() =>
      expect(doc.save).toHaveBeenCalledWith(expect.any(Blob), 'attachment.pdf'),
    );
  });

  it('reads the extension through a type with parameters', async () => {
    doc.fetch.mockResolvedValue({
      blob: new Blob(['x'], { type: 'application/pdf; charset=binary' }),
      fileName: null,
    });
    const { user } = renderDialog();
    await screen.findByRole('button', { name: 'd-bare' });

    await user.click(
      screen.getAllByRole('button', { name: 'administration.email.view.download' })[1],
    );

    await vi.waitFor(() =>
      expect(doc.save).toHaveBeenCalledWith(expect.any(Blob), 'attachment.pdf'),
    );
  });

  it('disables the download buttons while one is in flight', async () => {
    let finish: (v: unknown) => void = () => {};
    doc.fetch.mockReturnValue(new Promise(resolve => (finish = resolve)));
    const { user } = renderDialog();
    const buttons = async () =>
      screen.getAllByRole('button', { name: 'administration.email.view.download' });
    await screen.findByRole('button', { name: 'd-bare' });

    await user.click((await buttons())[0]);
    for (const b of await buttons()) expect(b).toBeDisabled();

    finish({ blob: new Blob(['x']), fileName: 'a.jpg' });
    await vi.waitFor(async () => {
      for (const b of await buttons()) expect(b).toBeEnabled();
    });
    expect(doc.fetch).toHaveBeenCalledTimes(1);
  });

  it('draws the body in the same font the Notification shell gives the email', async () => {
    renderDialog();

    const frame = await screen.findByTitle('administration.email.view.body');

    expect(frame.getAttribute('srcdoc')).toContain(
      "font-family:'Sarabun',Tahoma,'Segoe UI',sans-serif",
    );
    expect(frame.getAttribute('srcdoc')).toContain('<p>เรียน บริษัท</p>');
  });
});
