import { beforeEach, describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
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

const state = {
  previewReads: 0,
  // What GET preview?from=<email> returns (resend); the template when null.
  fromPreview: null as ReturnType<typeof preview> | null,
  fromReads: [] as string[],
  preview: preview(),
  uploads: 0,
  uploadFields: [] as { documentType: string; documentCategory: string }[],
};

beforeEach(() => {
  state.previewReads = 0;
  state.preview = preview();
  state.fromPreview = null;
  state.fromReads = [];
  state.uploads = 0;
  state.uploadFields = [];
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
    http.post('*/documents', async ({ request }) => {
      state.uploads += 1;
      const form = await request.formData();
      state.uploadFields.push({
        documentType: String(form.get('documentType')),
        documentCategory: String(form.get('documentCategory')),
      });
      return HttpResponse.json({
        isSuccess: true,
        documentId: 'd-up',
        fileName: 'หน้างาน.jpg',
        fileSize: 0.5 * MB,
        storageUrl: '',
      });
    }),
    http.get('*/appraisals/:id/assignment-email/preview', ({ request }) => {
      const from = new URL(request.url).searchParams.get('from');
      if (from) {
        state.fromReads.push(from);
        return HttpResponse.json(state.fromPreview ?? state.preview);
      }
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

    expect(onAssign).toHaveBeenCalledWith(
      {
        extraTo: ['boss@co.th'],
        cc: ['IntAdminAll', 'FollowupStaff', 'ops@lhbank.co.th'],
        subject: 'ขอนำส่งงานประเมิน 69105526',
        bodyHtml: state.preview.bodyHtml,
        attachments: [],
      },
      null,
    );
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
    // document.Documents.DocumentType and DocumentCategory are both nvarchar(10).
    expect(state.uploadFields).toEqual([
      { documentType: 'EMAIL_ATT', documentCategory: 'email_att' },
    ]);
    for (const value of Object.values(state.uploadFields[0]))
      expect(value.length).toBeLessThanOrEqual(10);

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

    // The second argument is the pressed button's flight origin (none in jsdom).
    expect(onAssign).toHaveBeenCalledWith(null, null);
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

describe('AssignmentEmailDialog: the drawer', () => {
  it('is a dialog whose header carries the assignment summary, and none when there is nothing to say', async () => {
    const { unmount } = renderDialog({
      summary: ['บริษัท ตัวอย่าง จำกัด', 'ติดตาม Somying (E0042)', 'ค่าธรรมเนียม 5,350.00 รวม VAT'],
    });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('administration.email.title')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'บริษัท ตัวอย่าง จำกัด · ติดตาม Somying (E0042) · ค่าธรรมเนียม 5,350.00 รวม VAT',
      ),
    ).toBeInTheDocument();
    // The actions stay in the same dialog, pinned under the body.
    expect(
      await within(dialog).findByRole('button', { name: 'administration.email.assignAndSend' }),
    ).toBeInTheDocument();
    unmount();

    renderDialog({ summary: [] });
    const bare = await screen.findByRole('dialog');
    // No grey line under the title when there is nothing to say.
    expect(within(bare).getByText('administration.email.title').nextElementSibling).toBeNull();
  });
});

describe('AssignmentEmailDialog: recipient suggestions', () => {
  const searched = { companies: [] as (string | null)[], users: [] as (string | null)[] };
  beforeEach(() => {
    searched.companies = [];
    searched.users = [];
    server.use(
      http.get('*/companies', ({ request }) => {
        searched.companies.push(new URL(request.url).searchParams.get('search'));
        return HttpResponse.json({
          companies: [
            { name: 'Acme Appraisal', nameLocal: null, email: 'info@acme.co.th', isActive: true },
            { name: 'No Mail Co', nameLocal: null, email: null, isActive: true },
          ],
        });
      }),
      http.get('*/auth/users', ({ request }) => {
        searched.users.push(new URL(request.url).searchParams.get('Search'));
        const user = (username: string, over: Record<string, unknown> = {}) => ({
          id: username,
          username,
          firstName: username,
          lastName: 'J',
          email: `${username}@lhbank.co.th`,
          isActive: true,
          isLocked: false,
          ...over,
        });
        return HttpResponse.json({
          items: [
            user('somchai'),
            user('locked', { isLocked: true }),
            user('nomail', { email: null }),
          ],
        });
      }),
    );
  });

  it('opens after two characters, grouped, with only those that have an address and can be used', async () => {
    const { user } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addCc'), 'so');

    const list = await screen.findByRole('listbox');
    const options = within(list)
      .getAllByRole('option')
      .map(o => o.textContent);
    expect(options).toEqual([
      'Acme Appraisal <info@acme.co.th>',
      'somchai J <somchai@lhbank.co.th>',
    ]);
    expect(within(list).getByText('administration.email.suggestCompanies')).toBeInTheDocument();
    expect(within(list).getByText('administration.email.suggestStaff')).toBeInTheDocument();
    expect(searched).toEqual({ companies: ['so'], users: ['so'] });
  });

  it('does not open on one character', async () => {
    const { user } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addCc'), 's');
    await new Promise(r => setTimeout(r, 400));

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(searched.users).toEqual([]);
  });

  it('works after a leading @, which is not part of the search', async () => {
    const { user } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addTo'), '@so');

    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    // "@" opened the browse list, then every character after it searched; the "@" is never in the term.
    await waitFor(() => expect(searched.users.at(-1)).toBe('so'));
    expect(searched.users.some(term => term?.includes('@'))).toBe(false);
  });

  it('stays a plain address field when an @ comes after the first character', async () => {
    const { user, onAssign } = renderDialog();
    const field = await screen.findByLabelText('administration.email.addTo');
    await user.type(field, 'somchai@lhbank.co.th');
    await new Promise(r => setTimeout(r, 400));

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(searched).toEqual({ companies: [], users: [] });

    await user.type(field, '{Enter}');
    await user.click(sendButton());
    expect(onAssign.mock.calls[0][0].extraTo).toEqual(['somchai@lhbank.co.th']);
  });

  it('adds the picked person as a named chip, and the POST carries the address', async () => {
    const { user, onAssign } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addTo'), 'so');

    await user.click(
      await screen.findByRole('button', { name: 'somchai J <somchai@lhbank.co.th>' }),
    );

    expect(screen.getByText('somchai J <somchai@lhbank.co.th>')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.click(sendButton());
    expect(onAssign.mock.calls[0][0].extraTo).toEqual(['somchai@lhbank.co.th']);
  });

  it('moves with the arrow keys, picks with Enter, and closes with Esc', async () => {
    const { user, onAssign } = renderDialog();
    const field = await screen.findByLabelText('administration.email.addCc');
    await user.type(field, 'ac');
    await screen.findByRole('listbox');
    expect(field).toHaveAttribute('aria-expanded', 'true');
    const options = () => screen.getAllByRole('option');
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    expect(field).toHaveAttribute('aria-activedescendant', options()[1].id);
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    // Only the list closed: the drawer is still there.
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.type(field, 'c');
    await screen.findByRole('listbox');
    // Enter waits while the search is still running (the rows may be the last one's).
    await waitFor(() => expect(screen.queryByText('administration.email.searching')).toBeNull());
    await user.keyboard('{Enter}');
    expect(screen.getByText('Acme Appraisal <info@acme.co.th>')).toBeInTheDocument();
    await user.click(sendButton());
    expect(onAssign.mock.calls[0][0].cc).toContain('info@acme.co.th');
  });
});

describe('AssignmentEmailDialog: recipient search states', () => {
  const people = (over: Record<string, unknown> = {}) => ({
    id: 'somchai',
    username: 'somchai',
    firstName: 'Somchai',
    lastName: 'J',
    email: 'somchai@lhbank.co.th',
    isActive: true,
    isLocked: false,
    ...over,
  });
  const answer = (opts: { companies?: unknown[]; users?: unknown[]; wait?: number } = {}) =>
    server.use(
      http.get('*/companies', async () => {
        if (opts.wait) await delay(opts.wait);
        return HttpResponse.json({ companies: opts.companies ?? [] });
      }),
      http.get('*/auth/users', async () => {
        if (opts.wait) await delay(opts.wait);
        return HttpResponse.json({ items: opts.users ?? [] });
      }),
    );

  it('"@" alone browses: the list opens at once, with no search term, and says to keep typing', async () => {
    const terms: (string | null)[] = [];
    server.use(
      http.get('*/companies', ({ request }) => {
        terms.push(new URL(request.url).searchParams.get('search'));
        return HttpResponse.json({
          companies: ['Zeta', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Eta'].map(name => ({
            name,
            email: `${name}@co.th`,
            isActive: true,
          })),
        });
      }),
      http.get('*/auth/users', ({ request }) => {
        terms.push(new URL(request.url).searchParams.get('Search'));
        return HttpResponse.json({ items: [people()] });
      }),
    );
    const { user } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addCc'), '@');

    const list = await screen.findByRole('listbox');
    // Five companies by name, then the staff.
    expect(
      within(list)
        .getAllByRole('option')
        .map(o => o.textContent),
    ).toEqual([
      'Alpha <Alpha@co.th>',
      'Beta <Beta@co.th>',
      'Delta <Delta@co.th>',
      'Epsilon <Epsilon@co.th>',
      'Eta <Eta@co.th>',
      'Somchai J <somchai@lhbank.co.th>',
    ]);
    expect(screen.getByText('administration.email.browseFooter')).toBeInTheDocument();
    expect(terms).toEqual([null, null]);
  });

  it('"@" with one character searches from that character', async () => {
    const terms: (string | null)[] = [];
    server.use(
      http.get('*/companies', () => HttpResponse.json({ companies: [] })),
      http.get('*/auth/users', ({ request }) => {
        terms.push(new URL(request.url).searchParams.get('Search'));
        return HttpResponse.json({ items: [people()] });
      }),
    );
    const { user } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addCc'), '@ร');

    await waitFor(() => expect(terms).toContain('ร'));
  });

  it('shows a loading row while it searches, then the empty state', async () => {
    answer({ wait: 300 });
    const { user } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addCc'), 'zz');

    expect(await screen.findByText('administration.email.searching')).toBeInTheDocument();
    expect(await screen.findByText('administration.email.noMatches')).toBeInTheDocument();
    expect(screen.queryByText('administration.email.searching')).toBeNull();
    expect(screen.queryByRole('option')).toBeNull();
  });

  it('keeps the last results while the next ones load, and the arrow keys skip the status rows', async () => {
    answer({
      users: [
        people(),
        people({ username: 'second', email: 'second@lhbank.co.th', firstName: 'Second' }),
      ],
    });
    const { user } = renderDialog();
    const field = await screen.findByLabelText('administration.email.addCc');
    await user.type(field, 'so');
    await screen.findAllByRole('option');
    answer({ wait: 400, users: [people()] });
    await user.type(field, 'm');

    expect(await screen.findByText('administration.email.searching')).toBeInTheDocument();
    // Still there, dimmed, while the new search runs.
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    for (const option of screen.getAllByRole('option')) expect(option.id).not.toBe('');
  });

  it('does not pick a stale row on Enter or click while the next search is still running', async () => {
    answer({ users: [people()] });
    const { user } = renderDialog();
    const field = await screen.findByLabelText('administration.email.addCc');
    await user.type(field, 'so');
    await screen.findByRole('option');
    answer({ wait: 400, users: [people()] });
    await user.type(field, 'm');
    await screen.findByText('administration.email.searching');

    expect(screen.getByRole('option')).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Somchai J <somchai@lhbank.co.th>' }));
    expect(screen.queryByText(/administration.email.removeItem/)).toBeNull();
    expect(screen.getByRole('option')).toBeInTheDocument();

    // Once the search lands, Enter picks.
    await waitFor(() => expect(screen.queryByText('administration.email.searching')).toBeNull());
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('option')).toBeNull();
    expect(screen.getByText('Somchai J <somchai@lhbank.co.th>')).toBeInTheDocument();
  });

  it('shows the other source when one fails', async () => {
    server.use(
      http.get('*/companies', () => HttpResponse.json({}, { status: 500 })),
      http.get('*/auth/users', () => HttpResponse.json({ items: [people()] })),
    );
    const { user } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addCc'), 'so');

    expect(await screen.findByRole('option')).toHaveTextContent('Somchai J <somchai@lhbank.co.th>');
    expect(await screen.findByText('administration.email.searchPartial')).toBeInTheDocument();
  });

  it('says so when everyone who matches is already in the box, rather than "not found"', async () => {
    state.preview = preview({
      cc: ['somchai@lhbank.co.th'],
      ccPeople: [{ email: 'somchai@lhbank.co.th', name: 'Somchai J' }],
    });
    answer({ users: [people()] });
    const { user } = renderDialog();
    await user.type(await screen.findByLabelText('administration.email.addCc'), '@som');

    expect(await screen.findByText('administration.email.allAdded')).toBeInTheDocument();
    expect(screen.queryByText('administration.email.noMatches')).toBeNull();
  });

  it('does not treat a query as an address: no error, no red box, Send stays on, nothing is sent', async () => {
    answer({ users: [] });
    const { user, onAssign } = renderDialog();
    const field = await screen.findByLabelText('administration.email.addCc');
    await user.type(field, '@p522');
    await screen.findByText('administration.email.noMatches');

    expect(screen.queryByText(/validation.invalidEmail/)).toBeNull();
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(sendButton()).toBeEnabled();

    // Leaving the field drops the query silently.
    await user.tab();
    expect(screen.queryByText(/validation.invalidEmail/)).toBeNull();
    expect(field).toHaveValue('');
    await user.click(sendButton());
    expect(onAssign.mock.calls[0][0].cc).toEqual([
      'IntAdminAll',
      'FollowupStaff',
      'FollowupSupervisor',
    ]);
  });
});

describe('AssignmentEmailDialog: the real recipients', () => {
  const removeButton = (chip: HTMLElement) =>
    within(chip.parentElement!).getByRole('button', { name: 'administration.email.removeItem' });

  it('shows the company name with its address', async () => {
    state.preview = preview({ companyName: 'บริษัท ตัวอย่าง จำกัด' });
    renderDialog();

    const locked = await screen.findByTitle('administration.email.companyLocked');
    expect(locked).toHaveTextContent('บริษัท ตัวอย่าง จำกัด <appraisal@example-val.co.th>');
    expect(sendButton()).toBeEnabled();
  });

  it('marks a company without an email, blocks sending, and unblocks it with an added address', async () => {
    state.preview = preview({ companyName: 'บริษัท ไร้เมล จำกัด', companyTo: null });
    const { user, onAssign } = renderDialog();

    expect(await screen.findByText('administration.email.companyNoEmail')).toBeInTheDocument();
    expect(screen.getByText('administration.email.companyNoEmailHint')).toBeInTheDocument();
    expect(screen.queryByText('administration.email.companyPending')).toBeNull();
    expect(screen.queryByText(/administration\.email\.toHint/)).toBeNull();
    expect(sendButton()).toBeDisabled();
    // Assigning without the email stays possible.
    await user.click(
      screen.getByRole('button', { name: 'administration.email.assignWithoutSend' }),
    );
    // The second argument is the pressed button's flight origin (none in jsdom).
    expect(onAssign).toHaveBeenCalledWith(null, null);

    await user.type(screen.getByLabelText('administration.email.addTo'), 'boss@co.th{Enter}');
    expect(sendButton()).toBeEnabled();
    await user.click(sendButton());
    expect(onAssign.mock.calls[1][0].extraTo).toEqual(['boss@co.th']);
  });

  it('keeps the placeholder when the company is not known yet', async () => {
    state.preview = preview({ companyName: null, companyTo: null });
    renderDialog();

    expect(await screen.findByText('administration.email.companyPending')).toBeInTheDocument();
    expect(screen.getByText(/administration\.email\.toHint/)).toBeInTheDocument();
    expect(screen.queryByText('administration.email.companyNoEmail')).toBeNull();
    expect(sendButton()).toBeEnabled();
  });

  it('shows each known person as a removable chip, and sends the addresses with the role tokens', async () => {
    state.preview = preview({
      cc: ['somchai@lhbank.co.th', 'FollowupStaff', 'typed@lhbank.co.th'],
      ccPeople: [
        { email: 'somchai@lhbank.co.th', name: 'สมชาย ใจดี' },
        { email: 'typed@lhbank.co.th', name: null },
      ],
    });
    const { user, onAssign } = renderDialog();

    expect(await screen.findByText('สมชาย ใจดี <somchai@lhbank.co.th>')).toBeInTheDocument();
    expect(screen.getByText('administration.email.cc.FollowupStaff')).toBeInTheDocument();
    await user.click(removeButton(screen.getByText('typed@lhbank.co.th')));
    await user.click(sendButton());

    expect(onAssign.mock.calls[0][0].cc).toEqual(['somchai@lhbank.co.th', 'FollowupStaff']);
  });

  it('shows the role hint only while a role token remains', async () => {
    state.preview = preview({
      cc: ['somchai@lhbank.co.th', 'FollowupStaff'],
      ccPeople: [{ email: 'somchai@lhbank.co.th', name: 'สมชาย ใจดี' }],
    });
    const { user } = renderDialog();

    expect(await screen.findByText(/administration\.email\.ccHint/)).toBeInTheDocument();
    await user.click(removeButton(screen.getByText('administration.email.cc.FollowupStaff')));
    expect(screen.queryByText(/administration\.email\.ccHint/)).toBeNull();
    // The role can be put back, and the hint returns with it.
    await user.click(
      screen.getByRole('button', { name: '+ administration.email.cc.FollowupStaff' }),
    );
    expect(screen.getByText(/administration\.email\.ccHint/)).toBeInTheDocument();
  });

  it('shows no role hint when every Cc is a known person', async () => {
    state.preview = preview({
      cc: ['somchai@lhbank.co.th'],
      ccPeople: [{ email: 'somchai@lhbank.co.th', name: 'สมชาย ใจดี' }],
    });
    renderDialog();

    await screen.findByText('สมชาย ใจดี <somchai@lhbank.co.th>');
    expect(screen.queryByText(/administration\.email\.ccHint/)).toBeNull();
  });
});

describe('AssignmentEmailDialog: ส่งอีกครั้ง from the read-only slip', () => {
  // The preview built from the latest email: its subject, body, extra To and files, and its Cc with the
  // roles the case knows already expanded to people.
  const fromLatest = (over: Record<string, unknown> = {}) =>
    preview({
      companyName: 'บริษัท ตัวอย่าง',
      extraTo: ['second@example.com'],
      cc: ['somchai@lhbank.co.th', 'FollowupSupervisor'],
      ccPeople: [{ email: 'somchai@lhbank.co.th', name: 'สมชาย ใจดี' }],
      subject: 'ขอนำส่งงานประเมิน ฉบับที่ส่งไป',
      bodyHtml: '<p>เรียน บริษัท ตัวอย่าง</p>',
      attachments: [
        { documentId: 'd-app', source: 'appraisal', fileName: 'แผนที่.jpg', fileSizeBytes: MB },
      ],
      ...over,
    });
  const failFrom = () =>
    server.use(
      http.get('*/appraisals/:id/assignment-email/preview', ({ request }) =>
        new URL(request.url).searchParams.get('from')
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json(state.preview),
      ),
    );
  beforeEach(() => {
    state.fromPreview = fromLatest();
  });

  it('starts from the latest email, keeps the locked company, and offers only to send', async () => {
    renderDialog({ resendFrom: 'e1' });

    expect(await screen.findByDisplayValue(state.fromPreview!.subject)).toBeInTheDocument();
    expect(screen.getByText('second@example.com')).toBeInTheDocument();
    expect(screen.getByText(/appraisal@example-val.co.th/)).toBeInTheDocument();
    expect(screen.getByText('แผนที่.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'administration.email.send' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'administration.email.assignWithoutSend' }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'administration.email.assignAndSend' })).toBeNull();
    // One read, of that email: the plain template is not read until "restore template".
    expect(state.fromReads).toEqual(['e1']);
    expect(state.previewReads).toBe(0);
  });

  it('shows the known people as name chips, a leftover role as a role chip, and sends the addresses', async () => {
    const { user, onAssign } = renderDialog({ resendFrom: 'e1' });

    expect(await screen.findByText('สมชาย ใจดี <somchai@lhbank.co.th>')).toBeInTheDocument();
    expect(screen.getByText('administration.email.cc.FollowupSupervisor')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'administration.email.send' }));

    expect(onAssign.mock.calls[0][0]).toMatchObject({
      extraTo: ['second@example.com'],
      cc: ['somchai@lhbank.co.th', 'FollowupSupervisor'],
    });
  });

  it('restores the plain template in place of the latest email', async () => {
    const { user } = renderDialog({ resendFrom: 'e1' });
    await screen.findByDisplayValue(state.fromPreview!.subject);

    await user.click(screen.getByRole('button', { name: 'administration.email.restoreTemplate' }));

    expect(await screen.findByDisplayValue('ขอนำส่งงานประเมิน 69105526')).toBeInTheDocument();
    expect(screen.queryByText('แผนที่.jpg')).toBeNull();
    expect(state.previewReads).toBe(1);
  });

  it('reads the plain template when there is no email to send from', async () => {
    renderDialog({ resendFrom: null });

    expect(await screen.findByDisplayValue('ขอนำส่งงานประเมิน 69105526')).toBeInTheDocument();
    expect(state.fromReads).toEqual([]);
    expect(state.previewReads).toBe(1);
  });

  it('cannot fall back to assigning when the latest email cannot be read', async () => {
    failFrom();
    renderDialog({ resendFrom: 'e1' });

    // The read retries once (about a second) before it gives up.
    expect(
      await screen.findByText('administration.email.loadLastFailed', undefined, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'administration.email.assignWithoutSend' }),
    ).toBeNull();
  });

  it('can start from the template when the latest email cannot be read', async () => {
    failFrom();
    const { user } = renderDialog({ resendFrom: 'e1' });

    await user.click(
      await screen.findByRole(
        'button',
        { name: 'administration.email.restoreTemplate' },
        { timeout: 4000 },
      ),
    );

    expect(await screen.findByDisplayValue('ขอนำส่งงานประเมิน 69105526')).toBeInTheDocument();
  });

  it('reads the latest email again after a failed read', async () => {
    let fail = true;
    server.use(
      http.get('*/appraisals/:id/assignment-email/preview', ({ request }) =>
        new URL(request.url).searchParams.get('from') && fail
          ? HttpResponse.json({}, { status: 500 })
          : HttpResponse.json(state.fromPreview),
      ),
    );
    const { user } = renderDialog({ resendFrom: 'e1' });

    const retry = await screen.findByRole(
      'button',
      { name: 'common:actions.retry' },
      { timeout: 4000 },
    );
    fail = false;
    await user.click(retry);

    expect(await screen.findByDisplayValue(state.fromPreview!.subject)).toBeInTheDocument();
  });

  it('does not keep a file the latest email uploaded when the template is restored', async () => {
    state.fromPreview = fromLatest({
      attachments: [
        { documentId: 'd-old-up', source: 'upload', fileName: 'เก่า.pdf', fileSizeBytes: MB },
      ],
    });
    const { user } = renderDialog({ resendFrom: 'e1' });
    expect(await screen.findByText('เก่า.pdf')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'administration.email.restoreTemplate' }));

    expect(await screen.findByDisplayValue('ขอนำส่งงานประเมิน 69105526')).toBeInTheDocument();
    expect(screen.queryByText('เก่า.pdf')).toBeNull();
  });
});
