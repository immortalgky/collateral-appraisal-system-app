import { describe, it, expect, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { server } from '@/test/mocks/server';
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils';
import type { UserProfile } from '../../types';
import TwoFactorCard from './TwoFactorCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, o?: { n?: number }) => (o?.n === undefined ? key : `${key}:${o.n}`),
    i18n: { language: 'en' },
  }),
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const baseMe: UserProfile = {
  id: 'u1',
  username: 'ann',
  firstName: 'Ann',
  lastName: 'Lee',
  authSource: 'Local',
  isActive: true,
  roles: [],
  permissions: [],
  groups: [],
  teams: [],
  mustChangePassword: false,
  twoFactorEnabled: false,
  twoFactorRequired: false,
  recoveryCodesLeft: 0,
};
const enabledMe: UserProfile = { ...baseMe, twoFactorEnabled: true, recoveryCodesLeft: 7 };

const CODES = Array.from({ length: 10 }, (_, i) => `aaaa-${1000 + i}`);
const API = '*/api/auth/me/two-factor';
const badCode = () =>
  HttpResponse.json(
    {
      title: 'Bad Request',
      status: 400,
      detail: 'The code is not valid.',
      errorCode: 'InvalidTwoFactorCode',
    },
    { status: 400 },
  );

/** Records the JSON bodies a handler receives, so a test can assert what was sent. */
const recorder = () => {
  const bodies: unknown[] = [];
  return { bodies, record: async (request: Request) => bodies.push(await request.json()) };
};

describe('TwoFactorCard states', () => {
  it('required but still off: says it will be asked for, and offers to turn it on', () => {
    render(<TwoFactorCard me={{ ...baseMe, twoFactorRequired: true }} />);
    expect(screen.getByText('twoFactor.requiredNotEnabledNote')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'twoFactor.enable.button' })).toBeInTheDocument();
  });

  it('off: offers to turn it on, nothing else', () => {
    render(<TwoFactorCard me={baseMe} />);
    expect(screen.getByText('twoFactor.statusOff')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'twoFactor.enable.button' })).toBeInTheDocument();
    expect(screen.queryByText('twoFactor.disable.button')).not.toBeInTheDocument();
    expect(screen.queryByText('twoFactor.regenerate.button')).not.toBeInTheDocument();
  });

  it('on: shows the recovery codes left and both actions', () => {
    render(<TwoFactorCard me={enabledMe} />);
    expect(screen.getByText('twoFactor.statusOn')).toBeInTheDocument();
    expect(screen.getByText('twoFactor.recoveryCodesLeft:7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'twoFactor.disable.button' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'twoFactor.regenerate.button' })).toBeInTheDocument();
    expect(screen.queryByText('twoFactor.enable.button')).not.toBeInTheDocument();
  });

  it('required: cannot be turned off, and says why', () => {
    render(<TwoFactorCard me={{ ...enabledMe, twoFactorRequired: true }} />);
    expect(screen.queryByText('twoFactor.disable.button')).not.toBeInTheDocument();
    expect(screen.getByText('twoFactor.requiredNote')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'twoFactor.regenerate.button' })).toBeInTheDocument();
  });

  it('is offered to an LDAP account too', () => {
    render(<TwoFactorCard me={{ ...baseMe, authSource: 'LDAP' }} />);
    expect(screen.getByRole('button', { name: 'twoFactor.enable.button' })).toBeInTheDocument();
  });
});

describe('TwoFactorCard enable flow', () => {
  const setup = () =>
    http.post(`${API}/setup`, () =>
      HttpResponse.json({
        sharedKey: 'abcd efgh ijkl',
        authenticatorUri: 'otpauth://totp/x',
        qrSvg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      }),
    );

  it('shows the QR and key, then the recovery codes, which cannot be dismissed until ticked', async () => {
    const sent = recorder();
    server.use(
      setup(),
      http.post(`${API}/enable`, async ({ request }) => {
        await sent.record(request);
        return HttpResponse.json({ recoveryCodes: CODES });
      }),
    );
    const queryClient = createTestQueryClient();
    const { user } = render(<TwoFactorCard me={baseMe} />, { queryClient });

    await user.click(screen.getByRole('button', { name: 'twoFactor.enable.button' }));
    const qr = await screen.findByAltText('twoFactor.enable.qrAlt');
    expect(qr.getAttribute('src')).toMatch(/^data:image\/svg\+xml;utf8,%3Csvg/);
    const key = document.querySelector('code')!;
    expect(key).toHaveTextContent('abcd efgh ijkl');
    // Each group is kept whole, so a long key wraps only between groups.
    expect(Array.from(key.querySelectorAll('span')).map(g => g.textContent)).toEqual([
      'abcd',
      'efgh',
      'ijkl',
    ]);

    const submit = screen.getByRole('button', { name: 'twoFactor.enable.submit' });
    expect(submit).toBeDisabled();
    // Digits only, six at most.
    await user.type(screen.getByLabelText('twoFactor.codeLabel'), '12a3 45678');
    expect(screen.getByLabelText('twoFactor.codeLabel')).toHaveValue('123456');
    await user.click(submit);

    expect(await screen.findByText(CODES[0])).toBeInTheDocument();
    expect(sent.bodies).toEqual([{ code: '123456' }]);
    // Only one dialog is open: the code dialog is gone by the time the codes show.
    expect(screen.queryByLabelText('twoFactor.codeLabel')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);

    // Esc does not dismiss it, and neither does the Done button until the box is ticked.
    const done = screen.getByRole('button', { name: 'twoFactor.recovery.done' });
    expect(done).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByText(CODES[0])).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));
    await user.click(done);
    await waitFor(() => expect(screen.queryByText(CODES[0])).not.toBeInTheDocument());

    // The codes were never kept by React Query, neither as a query nor as a mutation result.
    await waitFor(() => {
      const cached = JSON.stringify([
        queryClient
          .getQueryCache()
          .getAll()
          .map(q => q.state.data),
        queryClient
          .getMutationCache()
          .getAll()
          .map(m => m.state.data),
      ]);
      expect(cached).not.toContain(CODES[0]);
      // Nor the setup key: it lives in component state only.
      expect(cached).not.toContain('abcd efgh ijkl');
    });
  });

  it('shows a bad code under the field and keeps the dialog open', async () => {
    server.use(setup(), http.post(`${API}/enable`, badCode));
    const { user } = render(<TwoFactorCard me={baseMe} />);

    await user.click(screen.getByRole('button', { name: 'twoFactor.enable.button' }));
    await user.type(await screen.findByLabelText('twoFactor.codeLabel'), '000000');
    await user.click(screen.getByRole('button', { name: 'twoFactor.enable.submit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('twoFactor.errors.invalidCode');
    // Focus is back on the field, so the user can retype.
    expect(screen.getByLabelText('twoFactor.codeLabel')).toHaveFocus();
    expect(screen.queryByText(CODES[0])).not.toBeInTheDocument();

    // Editing the code clears the message (the field is already at max length, so delete first).
    await user.type(screen.getByLabelText('twoFactor.codeLabel'), '{Backspace}');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('accepts a code pasted with separators, keeping only the digits', async () => {
    server.use(setup());
    const { user } = render(<TwoFactorCard me={baseMe} />);

    await user.click(screen.getByRole('button', { name: 'twoFactor.enable.button' }));
    const input = await screen.findByLabelText('twoFactor.codeLabel');
    await user.click(input);
    await user.paste('123-456');

    expect(input).toHaveValue('123456');
    expect(screen.getByRole('button', { name: 'twoFactor.enable.submit' })).toBeEnabled();
  });

  it('shows the translation for a state errorCode instead of the server text', async () => {
    server.use(
      http.post(`${API}/setup`, () =>
        HttpResponse.json(
          {
            detail: 'Two-factor authentication is already on.',
            status: 400,
            errorCode: 'TwoFactorAlreadyEnabled',
          },
          { status: 400 },
        ),
      ),
    );
    const { user } = render(<TwoFactorCard me={baseMe} />);
    await user.click(screen.getByRole('button', { name: 'twoFactor.enable.button' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('twoFactor.errors.alreadyEnabled'),
    );
  });

  it('toasts, and opens nothing, when setup itself fails', async () => {
    server.use(
      http.post(`${API}/setup`, () =>
        HttpResponse.json({ detail: 'Already on.', status: 400 }, { status: 400 }),
      ),
    );
    const { user } = render(<TwoFactorCard me={baseMe} />);
    await user.click(screen.getByRole('button', { name: 'twoFactor.enable.button' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Already on.'));
    expect(screen.queryByLabelText('twoFactor.codeLabel')).not.toBeInTheDocument();
  });
});

describe('TwoFactorCard disable and regenerate', () => {
  it('says something went wrong, not "bad code", when the failure is not a rejected code', async () => {
    server.use(http.post(`${API}/disable`, () => new HttpResponse('oops', { status: 500 })));
    const { user } = render(<TwoFactorCard me={enabledMe} />);

    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.button' }));
    await user.type(await screen.findByLabelText('twoFactor.codeLabel'), '111111');
    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.submit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('twoFactor.errors.generic');
    expect(screen.getByRole('alert')).not.toHaveTextContent('twoFactor.errors.invalidCode');
  });

  it('does not refresh /auth/me when the save failed', async () => {
    server.use(
      http.post(`${API}/disable`, () =>
        HttpResponse.json(
          { detail: 'Could not save.', status: 400, errorCode: 'TwoFactorSaveFailed' },
          { status: 400 },
        ),
      ),
    );
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { user } = render(<TwoFactorCard me={enabledMe} />, { queryClient });

    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.button' }));
    await user.type(await screen.findByLabelText('twoFactor.codeLabel'), '111111');
    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.submit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('twoFactor.errors.saveFailed');
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('keeps freshly revealed codes when a second set follows quickly after the first closes', async () => {
    const NEXT = CODES.map(c => c.replace('aaaa', 'bbbb'));
    let call = 0;
    server.use(
      http.post(`${API}/recovery-codes`, () =>
        HttpResponse.json({ recoveryCodes: call++ === 0 ? CODES : NEXT }),
      ),
    );
    const { user } = render(<TwoFactorCard me={enabledMe} />);
    const regenerate = async () => {
      await user.click(screen.getByRole('button', { name: 'twoFactor.regenerate.button' }));
      await user.type(await screen.findByLabelText('twoFactor.codeLabel'), '222222');
      await user.click(screen.getByRole('button', { name: 'twoFactor.regenerate.submit' }));
    };

    await regenerate();
    await user.click(await screen.findByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'twoFactor.recovery.done' }));

    await regenerate();
    expect(await screen.findByText(NEXT[0])).toBeInTheDocument();
    // Outlast the first close's 400 ms drop timer: the new codes must still be there.
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(screen.getByText(NEXT[0])).toBeInTheDocument();
  });

  it('cannot be cancelled while the code is being sent', async () => {
    const sent = recorder();
    server.use(
      http.post(`${API}/disable`, async ({ request }) => {
        await sent.record(request);
        await delay(150);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = render(<TwoFactorCard me={enabledMe} />);

    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.button' }));
    await user.type(await screen.findByLabelText('twoFactor.codeLabel'), '111111');
    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.submit' }));

    expect(screen.getByRole('button', { name: 'common:actions.cancel' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByText('twoFactor.disable.title')).toBeInTheDocument();

    await waitFor(() => expect(sent.bodies).toEqual([{ code: '111111' }]));
    await waitFor(() =>
      expect(screen.queryByText('twoFactor.disable.title')).not.toBeInTheDocument(),
    );
  });

  it('refreshes /auth/me when the API refuses because the state moved on', async () => {
    server.use(
      http.post(`${API}/setup`, () =>
        HttpResponse.json(
          { detail: 'Already on.', status: 400, errorCode: 'TwoFactorAlreadyEnabled' },
          { status: 400 },
        ),
      ),
    );
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { user } = render(<TwoFactorCard me={baseMe} />, { queryClient });

    await user.click(screen.getByRole('button', { name: 'twoFactor.enable.button' }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['currentUser'] });
  });

  it('does not refresh /auth/me for a mere wrong code', async () => {
    server.use(http.post(`${API}/disable`, badCode));
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { user } = render(<TwoFactorCard me={enabledMe} />, { queryClient });

    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.button' }));
    await user.type(await screen.findByLabelText('twoFactor.codeLabel'), '111111');
    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.submit' }));
    await screen.findByRole('alert');
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('turning off asks for a code and sends it', async () => {
    const sent = recorder();
    server.use(
      http.post(`${API}/disable`, async ({ request }) => {
        await sent.record(request);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = render(<TwoFactorCard me={enabledMe} />);

    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.button' }));
    expect(await screen.findByText('twoFactor.disable.title')).toBeInTheDocument();
    await user.type(screen.getByLabelText('twoFactor.codeLabel'), '654321');
    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.submit' }));

    await waitFor(() => expect(sent.bodies).toEqual([{ code: '654321' }]));
    await waitFor(() =>
      expect(screen.queryByText('twoFactor.disable.title')).not.toBeInTheDocument(),
    );
  });

  it('a wrong code on turn-off stays inline', async () => {
    server.use(http.post(`${API}/disable`, badCode));
    const { user } = render(<TwoFactorCard me={enabledMe} />);

    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.button' }));
    await user.type(await screen.findByLabelText('twoFactor.codeLabel'), '111111');
    await user.click(screen.getByRole('button', { name: 'twoFactor.disable.submit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('twoFactor.errors.invalidCode');
    expect(screen.getByText('twoFactor.disable.title')).toBeInTheDocument();
  });

  it('regenerating shows the new codes once', async () => {
    server.use(
      http.post(`${API}/recovery-codes`, () => HttpResponse.json({ recoveryCodes: CODES })),
    );
    const { user } = render(<TwoFactorCard me={enabledMe} />);

    await user.click(screen.getByRole('button', { name: 'twoFactor.regenerate.button' }));
    await user.type(await screen.findByLabelText('twoFactor.codeLabel'), '222222');
    await user.click(screen.getByRole('button', { name: 'twoFactor.regenerate.submit' }));

    expect(await screen.findByText(CODES[9])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'twoFactor.recovery.done' })).toBeDisabled();
  });
});
