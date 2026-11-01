import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import AssignmentEmailDialog from './AssignmentEmailDialog';

/**
 * The email composer opened from Assign for EXT / EXTO. It is filled from the preview and hands the
 * edited email (or none) back through onAssign. The test i18n returns keys.
 */

// The upload code imports the app's i18n instance; loading it would translate every key asserted here.
vi.mock('@/i18n', () => ({ default: { t: (key: string) => key } }));

const MB = 1024 * 1024;

const preview = (over: Record<string, unknown> = {}) => ({
  companyTo: 'appraisal@example-val.co.th',
  extraTo: [],
  cc: ['IntAdminAll', 'FollowupStaff', 'FollowupSupervisor'],
  subject: 'ขอนำส่งงานประเมิน 69105526',
  bodyHtml: '<p>เรียน {{company}}</p><p>ผู้รับผิดชอบ : {{responsible}}</p>',
  attachments: [],
  maxAttachments: 10,
  maxAttachmentBytes: 10 * MB,
  ...over,
});

const state = { previewReads: 0, preview: preview(), uploads: 0 };

beforeEach(() => {
  state.previewReads = 0;
  state.preview = preview();
  state.uploads = 0;
  server.use(
    // Request documents carry no size: the dialog reads it from the document.
    http.get('*/requests/:id/documents', () =>
      HttpResponse.json({
        totalDocuments: 1,
        totalUploaded: 1,
        sections: [
          {
            titleId: null,
            sectionLabel: 'Request',
            totalDocuments: 1,
            uploadedDocuments: 1,
            documents: [{ id: 'rd1', documentId: 'd-req', fileName: 'โฉนดที่ดิน.pdf' }],
          },
        ],
      }),
    ),
    http.get('*/documents/d-req', () => HttpResponse.json({ fileSizeBytes: 1.2 * MB })),
    http.get('*/appraisals/:id/documents', () =>
      HttpResponse.json({
        totalTypes: 1,
        typesWithFiles: 1,
        types: [
          {
            code: 'MAP',
            name: 'Map',
            totalFiles: 1,
            files: [
              {
                id: 'af1',
                documentId: 'd-app',
                fileName: 'แผนที่.jpg',
                fileSizeBytes: 2 * MB,
                sortOrder: 0,
              },
            ],
          },
        ],
      }),
    ),
    http.post('*/documents/session', () => HttpResponse.json({ sessionId: 'S1' })),
    http.post('*/documents', () => {
      state.uploads += 1;
      return HttpResponse.json({
        isSuccess: true,
        documentId: 'd-up',
        fileName: 'หน้างาน.jpg',
        fileSize: 0.5 * MB,
        storageUrl: '',
      });
    }),
    http.get('*/appraisals/:id/assignment-email/preview', () => {
      state.previewReads += 1;
      return HttpResponse.json(state.preview);
    }),
  );
});

const renderDialog = (props: Partial<Parameters<typeof AssignmentEmailDialog>[0]> = {}) => {
  const onAssign = vi.fn();
  const result = render(
    <AssignmentEmailDialog
      isOpen
      appraisalId="A1"
      requestId="R1"
      onClose={vi.fn()}
      onAssign={onAssign}
      {...props}
    />,
  );
  return { ...result, onAssign };
};

const sendButton = () => screen.getByRole('button', { name: 'administration.email.assignAndSend' });

describe('AssignmentEmailDialog', () => {
  it('opens filled from the preview, with the company address locked', async () => {
    renderDialog();

    const locked = await screen.findByTitle('administration.email.companyLocked');
    expect(locked).toHaveTextContent('appraisal@example-val.co.th');
    expect(within(locked).queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('administration.email.subject')).toHaveValue(
      'ขอนำส่งงานประเมิน 69105526',
    );
    expect(screen.getByText('administration.email.cc.IntAdminAll')).toBeInTheDocument();
  });

  it('sends the email as edited, with the role tokens and added addresses', async () => {
    const { user, onAssign } = renderDialog();
    await screen.findByTitle('administration.email.companyLocked');

    await user.type(screen.getByLabelText('administration.email.addTo'), 'boss@co.th{Enter}');
    await user.type(screen.getByLabelText('administration.email.addCc'), 'ops@lhbank.co.th{Enter}');
    await user.click(
      within(
        screen.getByText('administration.email.cc.FollowupSupervisor').parentElement!,
      ).getByRole('button', { name: 'administration.email.removeItem' }),
    );
    await user.click(sendButton());

    expect(onAssign).toHaveBeenCalledWith({
      extraTo: ['boss@co.th'],
      cc: ['IntAdminAll', 'FollowupStaff', 'ops@lhbank.co.th'],
      subject: 'ขอนำส่งงานประเมิน 69105526',
      bodyHtml: state.preview.bodyHtml,
      attachments: [],
    });
  });

  it('attaches case documents and an upload, each with its source, and sends them', async () => {
    const { user, onAssign } = renderDialog();
    await screen.findByTitle('administration.email.companyLocked');

    await user.click(screen.getByRole('button', { name: /administration.email.pickDocuments/ }));
    // The shared Modal's title is not wired as the dialog's name.
    const picker = (await screen.findByText('administration.email.pickTitle')).closest(
      '[role="dialog"]',
    ) as HTMLElement;
    await user.click(await within(picker).findByRole('checkbox', { name: /โฉนดที่ดิน.pdf/ }));
    await user.click(await within(picker).findByRole('checkbox', { name: /แผนที่.jpg/ }));
    await user.click(within(picker).getByRole('button', { name: 'administration.email.attach' }));

    await user.upload(
      screen.getByLabelText('administration.email.upload'),
      new File(['x'], 'หน้างาน.jpg', { type: 'image/jpeg' }),
    );

    const list = await screen.findByRole('list', { name: 'administration.email.attachments' });
    await within(list).findByText('หน้างาน.jpg');
    const row = (name: string) => within(list).getByText(name).closest('li')!;
    expect(row('โฉนดที่ดิน.pdf')).toHaveTextContent('administration.email.source.request');
    expect(row('แผนที่.jpg')).toHaveTextContent('administration.email.source.appraisal');
    expect(row('หน้างาน.jpg')).toHaveTextContent('administration.email.source.upload');
    // 1.2 + 2 + 0.5 MB, once the request document's size has been read.
    expect(await screen.findByText('3 / 10 · 3.7 MB / 10 MB')).toBeInTheDocument();

    await user.click(sendButton());
    expect(onAssign.mock.calls[0][0].attachments).toEqual([
      { documentId: 'd-req', source: 'request' },
      { documentId: 'd-app', source: 'appraisal' },
      { documentId: 'd-up', source: 'upload' },
    ]);
  });

  it('refuses to send over the size limit, until a file is taken out', async () => {
    state.preview = preview({
      maxAttachmentBytes: 3 * MB,
      attachments: [
        { documentId: 'd1', source: 'request', fileName: 'แบบแปลน.pdf', fileSizeBytes: 2.5 * MB },
        { documentId: 'd2', source: 'upload', fileName: 'หน้างาน.jpg', fileSizeBytes: 1 * MB },
      ],
    });
    const { user } = renderDialog();

    expect(await screen.findByText('2 / 10 · 3.5 MB / 3 MB')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('administration.email.overLimit');
    expect(sendButton()).toBeDisabled();
    // Assigning without the email stays possible.
    expect(
      screen.getByRole('button', { name: 'administration.email.assignWithoutSend' }),
    ).toBeEnabled();

    await user.click(
      within(screen.getByText('แบบแปลน.pdf').closest('li')!).getByRole('button', {
        name: 'administration.email.removeItem',
      }),
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(sendButton()).toBeEnabled();
  });

  it('restores the template, dropping the edits', async () => {
    const { user } = renderDialog();
    const subject = await screen.findByLabelText('administration.email.subject');
    await user.clear(subject);
    await user.type(subject, 'edited');

    await user.click(screen.getByRole('button', { name: 'administration.email.restoreTemplate' }));

    await waitFor(() =>
      expect(screen.getByLabelText('administration.email.subject')).toHaveValue(
        'ขอนำส่งงานประเมิน 69105526',
      ),
    );
    expect(state.previewReads).toBe(2);
  });

  it('still offers to assign without the email when the template cannot be read', async () => {
    server.use(
      http.get('*/appraisals/:id/assignment-email/preview', () =>
        HttpResponse.json({ status: 500 }, { status: 500 }),
      ),
    );
    const { user, onAssign } = renderDialog();

    // The preview retries once (about a second) before it gives up.
    expect(await screen.findByRole('alert', undefined, { timeout: 4000 })).toHaveTextContent(
      'administration.email.loadFailed',
    );
    await user.click(
      screen.getByRole('button', { name: 'administration.email.assignWithoutSend' }),
    );

    expect(onAssign).toHaveBeenCalledWith(null);
  });

  it('does not send while an address typed in a field is not a recipient yet', async () => {
    const { user } = renderDialog();
    await screen.findByTitle('administration.email.companyLocked');

    await user.type(screen.getByLabelText('administration.email.addCc'), 'boss@bank');
    await user.tab();

    expect(screen.getByText(/validation.invalidEmail/)).toBeInTheDocument();
    expect(sendButton()).toBeDisabled();
    await user.clear(screen.getByLabelText('administration.email.addCc'));
    expect(sendButton()).toBeEnabled();
  });

  it('puts back a role that was taken out of Cc', async () => {
    const { user, onAssign } = renderDialog();
    const chip = await screen.findByText('administration.email.cc.FollowupStaff');
    await user.click(
      within(chip.parentElement!).getByRole('button', { name: 'administration.email.removeItem' }),
    );

    await user.click(
      screen.getByRole('button', { name: '+ administration.email.cc.FollowupStaff' }),
    );
    await user.click(sendButton());

    expect(onAssign.mock.calls[0][0].cc).toEqual([
      'IntAdminAll',
      'FollowupSupervisor',
      'FollowupStaff',
    ]);
  });

  it('adds every address of a pasted list and keeps the invalid one in the field', async () => {
    const { user, onAssign } = renderDialog();
    const field = await screen.findByLabelText('administration.email.addTo');

    await user.click(field);
    await user.paste('a@x.co.th, Somchai J <b@y.co.th>; bad@');
    await user.tab();

    expect(field).toHaveValue('bad@');
    await user.clear(field);
    await user.click(sendButton());
    expect(onAssign.mock.calls[0][0].extraTo).toEqual(['a@x.co.th', 'b@y.co.th']);
  });

  it('sends with an address typed and not yet committed, in one click', async () => {
    const { user, onAssign } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addTo'), 'bob@x.co.th');

    await user.click(sendButton());

    expect(onAssign.mock.calls[0][0].extraTo).toEqual(['bob@x.co.th']);
  });

  it('keeps the uploaded files when the template is restored', async () => {
    const { user } = renderDialog();
    await screen.findByTitle('administration.email.companyLocked');
    await user.upload(
      screen.getByLabelText('administration.email.upload'),
      new File(['x'], 'หน้างาน.jpg', { type: 'image/jpeg' }),
    );
    await screen.findByText('หน้างาน.jpg');

    await user.click(screen.getByRole('button', { name: 'administration.email.restoreTemplate' }));

    await waitFor(() => expect(state.previewReads).toBe(2));
    expect(await screen.findByText('หน้างาน.jpg')).toBeInTheDocument();
  });
});

describe('AssignmentEmailDialog: ส่งอีกครั้ง from the read-only slip', () => {
  const latest = {
    id: 'e1',
    status: 'Sent',
    sentAt: '2026-10-29T14:33:00',
    sentTo: ['appraisal@example-val.co.th', 'second@example.com'],
    sentCc: ['admin@bank.example'],
    extraTo: ['second@example.com'],
    cc: ['IntAdminAll'],
    subject: 'ขอนำส่งงานประเมิน ฉบับที่ส่งไป',
    bodyHtml: '<p>เรียน บริษัท ตัวอย่าง</p>',
    attachments: [
      { documentId: 'd-app', source: 'appraisal', fileName: 'แผนที่.jpg', fileSizeBytes: MB },
    ],
  };
  beforeEach(() => {
    server.use(http.get('*/appraisals/:id/assignment-emails/e1', () => HttpResponse.json(latest)));
  });

  it('starts from the latest email, keeps the locked company, and offers only to send', async () => {
    renderDialog({ resendFrom: 'e1' });

    expect(await screen.findByDisplayValue(latest.subject)).toBeInTheDocument();
    expect(screen.getByText('second@example.com')).toBeInTheDocument();
    expect(screen.getByText('appraisal@example-val.co.th')).toBeInTheDocument();
    expect(screen.getByText('แผนที่.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'administration.email.send' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'administration.email.assignWithoutSend' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'administration.email.assignAndSend' })).toBeNull();
  });

  it('restores the system template in place of the latest email', async () => {
    const { user } = renderDialog({ resendFrom: 'e1' });
    await screen.findByDisplayValue(latest.subject);

    await user.click(screen.getByRole('button', { name: 'administration.email.restoreTemplate' }));

    expect(await screen.findByDisplayValue('ขอนำส่งงานประเมิน 69105526')).toBeInTheDocument();
    expect(screen.queryByText('แผนที่.jpg')).toBeNull();
  });

  it('cannot fall back to assigning when the latest email cannot be read', async () => {
    server.use(
      http.get('*/appraisals/:id/assignment-emails/e1', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    renderDialog({ resendFrom: 'e1' });

    // The read retries once (about a second) before it gives up.
    expect(
      await screen.findByText('administration.email.loadFailed', undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'administration.email.assignWithoutSend' }),
    ).toBeNull();
  });
});
