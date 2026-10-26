import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { server } from '@/test/mocks/server';
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils';
import { useAuthStore } from '@features/auth/store';
import type { User } from '@features/auth/types';
import { startSignIn } from '@features/auth/utils/auth';
import type { Passkey } from '../../types';
import PasskeysCard from './PasskeysCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@features/auth/utils/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@features/auth/utils/auth')>()),
  startSignIn: vi.fn(),
}));

const API = '*/api/auth/me/passkeys';

const passkey = (over: Partial<Passkey> = {}): Passkey => ({
  id: 'p1',
  name: 'MacBook Touch ID',
  synced: true,
  createdAt: '2026-10-12T09:00:00',
  lastUsedAt: '2026-10-15T09:14:00',
  ...over,
});

const OPTIONS = {
  options: { challenge: 'abc', rp: { id: 'idp.example.com', name: 'CAS' } },
  state: 'sealed-state',
};
const CREDENTIAL_JSON = { id: 'cred-1', type: 'public-key' };

const create = vi.fn();
const parse = vi.fn((options: object) => ({ ...options, parsed: true }));
const signalUnknown = vi.fn().mockResolvedValue(undefined);

/** What a browser with passkey support exposes; `toJSON` must be on the prototype. */
class FakePublicKeyCredential {
  static parseCreationOptionsFromJSON = parse;
  static signalUnknownCredential = signalUnknown;
  id = 'cred-1';
  toJSON() {
    return CREDENTIAL_JSON;
  }
}

/** Server side of the registration endpoints; the tests override the pieces they care about. */
const serve = (list: Passkey[] = []) => {
  const seen = { optionsCalls: 0, registered: [] as unknown[], renamed: [] as unknown[] };
  server.use(
    http.get(API, () => HttpResponse.json(list)),
    http.post(`${API}/register/options`, () => {
      seen.optionsCalls += 1;
      return HttpResponse.json(OPTIONS);
    }),
    http.post(`${API}/register`, async ({ request }) => {
      seen.registered.push(await request.json());
      return HttpResponse.json(passkey({ id: 'new', name: 'Office laptop' }));
    }),
    http.put(`${API}/:id`, async ({ request, params }) => {
      seen.renamed.push({ id: params.id, ...((await request.json()) as object) });
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return seen;
};

const problem = (errorCode: string, detail = 'server text') =>
  HttpResponse.json({ title: 'Bad Request', status: 400, detail, errorCode }, { status: 400 });

const openAddDialog = async (user: ReturnType<typeof render>['user']) => {
  await screen.findByText('passkeys.empty');
  await user.click(screen.getByRole('button', { name: 'passkeys.add.button' }));
};

/** The dialog's own confirm button, once the name is typed and the options have arrived. */
const typeNameAndGetSubmit = async (user: ReturnType<typeof render>['user'], name: string) => {
  await user.type(await screen.findByLabelText('passkeys.add.nameLabel'), name);
  const submit = screen.getByRole('button', { name: 'passkeys.add.submit' });
  await waitFor(() => expect(submit).toBeEnabled());
  return submit;
};

describe('PasskeysCard', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true, user: { username: 'ann' } as User });
    vi.stubGlobal('PublicKeyCredential', FakePublicKeyCredential);
    Object.defineProperty(navigator, 'credentials', { value: { create }, configurable: true });
    create.mockReset();
    create.mockResolvedValue(new FakePublicKeyCredential());
    signalUnknown.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(startSignIn).mockClear();
  });
  afterEach(() => {
    useAuthStore.setState({ isAuthenticated: false, user: null });
    vi.useRealTimers();
    vi.unstubAllGlobals();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).credentials;
  });

  describe('list', () => {
    it('says so when there are none', async () => {
      serve([]);
      render(<PasskeysCard />);
      expect(await screen.findByText('passkeys.empty')).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('lists each passkey with its type, and "never used" only for one never used', async () => {
      serve([passkey(), passkey({ id: 'p2', name: 'Office PC', synced: false, lastUsedAt: null })]);
      render(<PasskeysCard />);

      const rows = await screen.findAllByRole('row');
      expect(rows).toHaveLength(3); // header + 2
      const [synced, bound] = [within(rows[1]), within(rows[2])];
      expect(synced.getByText('MacBook Touch ID')).toBeInTheDocument();
      expect(synced.getByText('passkeys.typeSynced')).toBeInTheDocument();
      expect(synced.queryByText('passkeys.neverUsed')).not.toBeInTheDocument();
      expect(bound.getByText('Office PC')).toBeInTheDocument();
      expect(bound.getByText('passkeys.typeDevice')).toBeInTheDocument();
      expect(bound.getByText('passkeys.neverUsed')).toBeInTheDocument();
      // Only what the API knows: no vendor names.
      expect(screen.queryByText(/iCloud|Google/)).not.toBeInTheDocument();
    });

    it('says when the list cannot be loaded', async () => {
      server.use(http.get(API, () => HttpResponse.json({}, { status: 500 })));
      render(<PasskeysCard />);
      expect(await screen.findByText('passkeys.loadFailed')).toBeInTheDocument();
    });

    it('always shows the notes, including the 10-minute rule', async () => {
      serve([]);
      render(<PasskeysCard />);
      expect(await screen.findByText('passkeys.notes.recentSignIn')).toBeInTheDocument();
      expect(screen.getByText('passkeys.notes.lostDevice')).toBeInTheDocument();
    });
  });

  describe('add', () => {
    it('fetches the options when the dialog opens and calls create() straight from the click', async () => {
      const seen = serve();
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      const submit = await typeNameAndGetSubmit(user, '  Office laptop ');
      expect(seen.optionsCalls).toBe(1);

      // Synchronous: Safari drops the user activation across an await.
      fireEvent.click(submit);
      expect(create).toHaveBeenCalledTimes(1);
      // What the (mocked) parser made of the server's options, plus a signal to dismiss the prompt.
      expect(create).toHaveBeenCalledWith({
        publicKey: { ...OPTIONS.options, parsed: true },
        signal: expect.any(AbortSignal),
      });
      expect(parse).toHaveBeenCalledWith(OPTIONS.options);

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.added'));
      expect(seen.registered).toEqual([
        { state: 'sealed-state', name: 'Office laptop', credential: CREDENTIAL_JSON },
      ]);
      await waitFor(() =>
        expect(screen.queryByLabelText('passkeys.add.nameLabel')).not.toBeInTheDocument(),
      );
    });

    it('refreshes the list after adding', async () => {
      const seen = serve();
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      const submit = await typeNameAndGetSubmit(user, 'Office laptop');

      // What the list answers once the registration has gone through.
      server.use(
        http.get(API, () => HttpResponse.json([passkey({ id: 'new', name: 'Office laptop' })])),
      );
      fireEvent.click(submit);
      await waitFor(() => expect(seen.registered).toHaveLength(1));
      expect(await screen.findByText('Office laptop')).toBeInTheDocument();
    });

    it('treats a dismissed browser prompt as neutral, not as an error', async () => {
      const seen = serve();
      create.mockRejectedValue(new DOMException('dismissed', 'NotAllowedError'));
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

      expect(await screen.findByRole('status')).toHaveTextContent('passkeys.add.cancelled');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(toast.error).not.toHaveBeenCalled();
      expect(seen.registered).toHaveLength(0);
      // Still open, and the same options can be used again.
      expect(screen.getByLabelText('passkeys.add.nameLabel')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'passkeys.add.submit' })).toBeEnabled();
    });

    it('says so when this authenticator already holds a passkey for the account', async () => {
      serve();
      create.mockRejectedValue(new DOMException('exists', 'InvalidStateError'));
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'passkeys.errors.alreadyRegistered',
      );
    });

    it('shows a generic message for any other browser failure', async () => {
      serve();
      create.mockRejectedValue(new DOMException('boom', 'SecurityError'));
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));
      expect(await screen.findByRole('alert')).toHaveTextContent('passkeys.add.createFailed');
    });

    it('maps the API errorCode of a rejected registration to its own text, inline', async () => {
      serve();
      server.use(http.post(`${API}/register`, () => problem('PasskeyRegistrationFailed')));
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'passkeys.errors.registrationFailed',
      );
      expect(toast.error).not.toHaveBeenCalled();
      // Not about the name, so the Name field is not marked invalid.
      expect(screen.getByLabelText('passkeys.add.nameLabel')).toHaveAttribute(
        'aria-invalid',
        'false',
      );
    });

    it('puts only a name error on the Name field', async () => {
      serve();
      server.use(http.post(`${API}/register`, () => problem('PasskeyNameInvalid')));
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

      expect(await screen.findByRole('alert')).toHaveTextContent('passkeys.errors.nameInvalid');
      expect(screen.getByLabelText('passkeys.add.nameLabel')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });

    describe('registration options age', () => {
      // Only the clock moves; the options are fetched once, when the dialog opens.
      const useFakeClock = () => vi.useFakeTimers({ toFake: ['Date'] });

      it('uses options that are still young', async () => {
        useFakeClock();
        const seen = serve();
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        const submit = await typeNameAndGetSubmit(user, 'Office laptop');

        vi.setSystemTime(Date.now() + 2 * 60_000);
        fireEvent.click(submit);
        expect(create).toHaveBeenCalledTimes(1);
        expect(seen.optionsCalls).toBe(1);
      });

      it('does not call create() on stale options: refreshes them and asks for another click', async () => {
        useFakeClock();
        const seen = serve();
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        const submit = await typeNameAndGetSubmit(user, 'Office laptop');

        vi.setSystemTime(Date.now() + 4 * 60_000);
        fireEvent.click(submit);
        expect(create).not.toHaveBeenCalled();
        expect(await screen.findByRole('status')).toHaveTextContent('passkeys.add.refreshed');
        await waitFor(() => expect(seen.optionsCalls).toBe(2));

        // The next click, on fresh options, goes straight to create().
        const again = screen.getByRole('button', { name: 'passkeys.add.submit' });
        await waitFor(() => expect(again).toBeEnabled());
        fireEvent.click(again);
        expect(create).toHaveBeenCalledTimes(1);
      });
    });

    it('never calls create() for a name the server would refuse (control characters)', async () => {
      serve();
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      const submit = await typeNameAndGetSubmit(user, 'x');
      fireEvent.change(screen.getByLabelText('passkeys.add.nameLabel'), {
        target: { value: 'Bad\u0007name' },
      });
      fireEvent.click(submit);

      expect(create).not.toHaveBeenCalled();
      expect(await screen.findByRole('alert')).toHaveTextContent('passkeys.errors.nameInvalid');
      expect(screen.getByLabelText('passkeys.add.nameLabel')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });

    describe('a credential the server did not take', () => {
      // The 400s that say the passkey was not saved.
      it.each([
        'PasskeyStateExpired',
        'PasskeyRegistrationFailed',
        'PasskeyLimitReached',
        'PasskeyNameInvalid',
      ])('asks the provider to drop it after a 400 %s, then shows the error', async code => {
        serve();
        server.use(http.post(`${API}/register`, () => problem(code)));
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(signalUnknown).toHaveBeenCalledTimes(1);
        expect(signalUnknown).toHaveBeenCalledWith({
          rpId: 'idp.example.com',
          credentialId: 'cred-1',
        });
      });

      // Anything else may have committed the save (or says the server has it): keep the credential.
      it.each([
        ['a 500', () => HttpResponse.json({}, { status: 500 })],
        [
          'a 503',
          () => HttpResponse.json({ errorCode: 'PasskeyRegistrationFailed' }, { status: 503 }),
        ],
        ['a network error', () => HttpResponse.error()],
        ['a 400 without an errorCode', () => HttpResponse.json({ detail: 'x' }, { status: 400 })],
        ['a 400 with an unknown errorCode', () => problem('SomethingNew')],
      ])('does not signal after %s', async (_name, respond) => {
        serve();
        server.use(http.post(`${API}/register`, respond));
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(signalUnknown).not.toHaveBeenCalled();
      });

      // After an unclear failure the passkey may have been saved: refetch the options so that a
      // retry lists it in excludeCredentials, and reload the list.
      it.each([
        ['a 503', () => HttpResponse.json({}, { status: 503 })],
        ['a network error', () => HttpResponse.error()],
      ])('refetches the options and the list after %s', async (_name, respond) => {
        const seen = serve();
        let listCalls = 0;
        server.use(
          http.get(API, () => {
            listCalls += 1;
            return HttpResponse.json([]);
          }),
          http.post(`${API}/register`, respond),
        );
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        await waitFor(() => expect(seen.optionsCalls).toBe(2));
        await waitFor(() => expect(listCalls).toBe(2));
      });

      it.each([['PasskeyAlreadyRegistered'], ['PasskeyRegistrationFailed'], ['SomethingNew']])(
        'does not refetch the options after a definite refusal (%s), but reloads the list',
        async code => {
          const seen = serve();
          let listCalls = 0;
          server.use(
            http.get(API, () => {
              listCalls += 1;
              return HttpResponse.json([]);
            }),
            http.post(`${API}/register`, () => problem(code)),
          );
          const { user } = render(<PasskeysCard />);
          await openAddDialog(user);
          fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

          expect(await screen.findByRole('alert')).toBeInTheDocument();
          await waitFor(() => expect(listCalls).toBe(2));
          expect(seen.optionsCalls).toBe(1);
        },
      );

      it('does not signal when create() itself failed: there is no credential', async () => {
        serve();
        create.mockRejectedValue(new DOMException('dismissed', 'NotAllowedError'));
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        expect(await screen.findByRole('status')).toBeInTheDocument();
        expect(signalUnknown).not.toHaveBeenCalled();
      });

      it('does not signal when the server already holds this very credential', async () => {
        serve();
        server.use(http.post(`${API}/register`, () => problem('PasskeyAlreadyRegistered')));
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'passkeys.errors.alreadyRegistered',
        );
        expect(signalUnknown).not.toHaveBeenCalled();
      });

      it('still shows the error when the Signal API throws or rejects', async () => {
        serve();
        server.use(http.post(`${API}/register`, () => problem('PasskeyRegistrationFailed')));
        signalUnknown.mockImplementationOnce(() => {
          throw new Error('nope');
        });
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));
        expect(await screen.findByRole('alert')).toHaveTextContent(
          'passkeys.errors.registrationFailed',
        );

        signalUnknown.mockRejectedValueOnce(new Error('rejected'));
        fireEvent.click(screen.getByRole('button', { name: 'passkeys.add.submit' }));
        await waitFor(() => expect(signalUnknown).toHaveBeenCalledTimes(2));
      });
    });

    describe('the browser prompt and the save', () => {
      /** A create() that stays pending until its signal is aborted, like an open prompt. */
      const pendingPrompt = () =>
        create.mockImplementation(
          ({ signal }: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) =>
              signal.addEventListener('abort', () =>
                reject(new DOMException('aborted', 'AbortError')),
              ),
            ),
        );

      it('passes an abort signal, and Cancel stays usable and dismisses the prompt quietly', async () => {
        const seen = serve();
        pendingPrompt();
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        const { signal } = create.mock.calls[0][0] as { signal: AbortSignal };
        expect(signal).toBeInstanceOf(AbortSignal);
        expect(signal.aborted).toBe(false);
        const cancel = screen.getByRole('button', { name: 'common:actions.cancel' });
        expect(cancel).toBeEnabled();
        expect(screen.getByLabelText('Close modal')).toBeInTheDocument();

        await user.click(cancel);
        expect(signal.aborted).toBe(true);
        await waitFor(() =>
          expect(screen.queryByLabelText('passkeys.add.nameLabel')).not.toBeInTheDocument(),
        );
        // Quiet: nothing said, nothing sent.
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(toast.error).not.toHaveBeenCalled();
        expect(seen.registered).toHaveLength(0);
        expect(signalUnknown).not.toHaveBeenCalled();
      });

      it('Esc dismisses the prompt too', async () => {
        serve();
        pendingPrompt();
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));
        const { signal } = create.mock.calls[0][0] as { signal: AbortSignal };

        await user.keyboard('{Escape}');
        expect(signal.aborted).toBe(true);
      });

      it('blocks closing only while the registration is being saved', async () => {
        const seen = serve();
        server.use(
          http.post(`${API}/register`, async ({ request }) => {
            seen.registered.push(await request.json());
            await delay(300);
            return HttpResponse.json(passkey({ id: 'new', name: 'Office laptop' }));
          }),
        );
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        // The save is in flight: Cancel is disabled, the X is gone, and Esc does nothing.
        await waitFor(() =>
          expect(screen.getByRole('button', { name: 'common:actions.cancel' })).toBeDisabled(),
        );
        expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
        await user.keyboard('{Escape}');
        expect(screen.getByLabelText('passkeys.add.nameLabel')).toBeInTheDocument();

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.added'));
        expect(seen.registered).toHaveLength(1);
      });

      it('resolves the add as soon as the registration is saved, not when the list has reloaded', async () => {
        serve();
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        const submit = await typeNameAndGetSubmit(user, 'Office laptop');

        let listAnswered = false;
        server.use(
          http.get(API, async () => {
            await delay(500);
            listAnswered = true;
            return HttpResponse.json([passkey({ id: 'new', name: 'Office laptop' })]);
          }),
        );
        fireEvent.click(submit);

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.added'));
        expect(listAnswered).toBe(false);
      });

      it('starts the form over only after the dialog has closed', async () => {
        serve();
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        await user.type(await screen.findByLabelText('passkeys.add.nameLabel'), 'Old name');
        await user.click(screen.getByRole('button', { name: 'common:actions.cancel' }));
        await waitFor(() =>
          expect(screen.queryByLabelText('passkeys.add.nameLabel')).not.toBeInTheDocument(),
        );

        await new Promise(resolve => setTimeout(resolve, 450));
        await user.click(screen.getByRole('button', { name: 'passkeys.add.button' }));
        expect(await screen.findByLabelText('passkeys.add.nameLabel')).toHaveValue('');
      });
    });

    it('drops the "refreshed" notice when the refresh itself fails', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      let calls = 0;
      server.use(
        http.get(API, () => HttpResponse.json([])),
        http.post(`${API}/register/options`, () => {
          calls += 1;
          return calls === 1 ? HttpResponse.json(OPTIONS) : problem('PasskeyLimitReached');
        }),
      );
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      const submit = await typeNameAndGetSubmit(user, 'Office laptop');

      vi.setSystemTime(Date.now() + 4 * 60_000);
      fireEvent.click(submit);

      expect(await screen.findByText('passkeys.errors.limitReached')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText('passkeys.add.refreshed')).not.toBeInTheDocument();
    });

    describe('serialising the credential', () => {
      // What a password-manager extension may hand back: the standard members, no toJSON.
      const bytes = (...values: number[]) => new Uint8Array(values).buffer;
      const extensionCredential = (over: object = {}) => ({
        id: 'cred-1',
        rawId: bytes(1, 2, 3, 250),
        type: 'public-key',
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: bytes(251, 255),
          attestationObject: bytes(1, 2, 3, 250),
          getTransports: () => ['internal'],
        },
        getClientExtensionResults: () => ({ credProps: { rk: true } }),
        ...over,
      });
      // base64url, no padding: [1,2,3,250] -> "AQID+g==" -> "AQID-g"; [251,255] -> "+/8=" -> "-_8".
      const EXPECTED = {
        id: 'cred-1',
        rawId: 'AQID-g',
        type: 'public-key',
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: '-_8',
          attestationObject: 'AQID-g',
          transports: ['internal'],
        },
        clientExtensionResults: { credProps: { rk: true } },
      };

      it('writes the registration response by hand when the credential has no toJSON', async () => {
        const seen = serve();
        create.mockResolvedValue(extensionCredential());
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.added'));
        expect(seen.registered).toEqual([
          { state: 'sealed-state', name: 'Office laptop', credential: EXPECTED },
        ]);
      });

      it('does the same when its toJSON throws', async () => {
        const seen = serve();
        create.mockResolvedValue(
          extensionCredential({
            toJSON: () => {
              throw new Error('broken wrapper');
            },
          }),
        );
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.added'));
        expect(seen.registered).toEqual([
          { state: 'sealed-state', name: 'Office laptop', credential: EXPECTED },
        ]);
      });

      it('survives optional members that throw: each falls back on its own', async () => {
        const seen = serve();
        const broken = () => {
          throw new TypeError('Illegal invocation');
        };
        const credential = extensionCredential({
          response: {
            clientDataJSON: bytes(251, 255),
            attestationObject: bytes(1, 2, 3, 250),
            getTransports: broken,
          },
          getClientExtensionResults: broken,
        });
        // A getter, like a wrapped native credential whose brand check fails.
        Object.defineProperty(credential, 'authenticatorAttachment', { get: broken });
        create.mockResolvedValue(credential);
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.added'));
        expect(seen.registered[0]).toMatchObject({
          credential: {
            rawId: 'AQID-g',
            response: { clientDataJSON: '-_8', attestationObject: 'AQID-g', transports: [] },
            clientExtensionResults: {},
          },
        });
      });

      it('leaves out what the credential cannot tell (no transports, no extension results)', async () => {
        const seen = serve();
        create.mockResolvedValue(
          extensionCredential({
            authenticatorAttachment: null,
            response: { clientDataJSON: bytes(251, 255), attestationObject: bytes(1, 2, 3, 250) },
            getClientExtensionResults: undefined,
          }),
        );
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        await waitFor(() => expect(seen.registered).toHaveLength(1));
        expect(seen.registered[0]).toMatchObject({
          credential: { response: { transports: [] }, clientExtensionResults: {} },
        });
      });
    });

    it('cannot be closed by Cancel or Esc in the instant between create() resolving and the re-render', async () => {
      const seen = serve();
      // toJSON runs right after create() resolved, before React has re-rendered: press Esc there.
      const signals: AbortSignal[] = [];
      create.mockImplementation(({ signal }: { signal: AbortSignal }) => {
        signals.push(signal);
        return Promise.resolve({
          id: 'cred-1',
          toJSON: () => {
            fireEvent.keyDown(document.body, { key: 'Escape' });
            return CREDENTIAL_JSON;
          },
        });
      });
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.added'));
      expect(seen.registered).toHaveLength(1);
      expect(signals[0].aborted).toBe(false);
    });

    describe('a credential that never reached the server', () => {
      it('signals it when it cannot be serialised for the registration request', async () => {
        const seen = serve();
        create.mockResolvedValue({
          id: 'cred-1',
          toJSON: () => {
            throw new Error('cannot serialise');
          },
        });
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        expect(await screen.findByRole('alert')).toBeInTheDocument();
        expect(seen.registered).toHaveLength(0);
        expect(signalUnknown).toHaveBeenCalledWith({
          rpId: 'idp.example.com',
          credentialId: 'cred-1',
        });
      });

      it('says it could not be created, and signals nothing, when create() returns no credential', async () => {
        const seen = serve();
        create.mockResolvedValue(null);
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);
        fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

        expect(await screen.findByRole('alert')).toHaveTextContent('passkeys.add.createFailed');
        expect(seen.registered).toHaveLength(0);
        expect(signalUnknown).not.toHaveBeenCalled();
      });
    });

    it('starts from an empty form when reopened straight after closing', async () => {
      serve();
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      await user.type(await screen.findByLabelText('passkeys.add.nameLabel'), 'Old name');
      await user.click(screen.getByRole('button', { name: 'common:actions.cancel' }));
      await user.click(await screen.findByRole('button', { name: 'passkeys.add.button' }));

      expect(await screen.findByLabelText('passkeys.add.nameLabel')).toHaveValue('');
    });

    it('turns the submit button off and shows the limit when it is reached meanwhile', async () => {
      let optionsCalls = 0;
      server.use(
        http.get(API, () => HttpResponse.json([])),
        http.post(`${API}/register/options`, () => {
          optionsCalls += 1;
          return optionsCalls === 1 ? HttpResponse.json(OPTIONS) : problem('PasskeyLimitReached');
        }),
        http.post(`${API}/register`, () => problem('PasskeyLimitReached')),
      );
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

      await waitFor(() => expect(optionsCalls).toBe(2));
      expect(await screen.findByText('passkeys.errors.limitReached')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'passkeys.add.submit' })).toBeDisabled();
      // A refusal does not go away by asking again.
      expect(screen.queryByText('passkeys.add.retry')).not.toBeInTheDocument();
    });

    describe('when the options cannot be fetched', () => {
      it.each([
        ['a server error', () => HttpResponse.json({}, { status: 503 })],
        ['a network error', () => HttpResponse.error()],
      ])('offers to try again after %s, and goes on once it works', async (_name, fail) => {
        let calls = 0;
        server.use(
          http.get(API, () => HttpResponse.json([])),
          http.post(`${API}/register/options`, () => {
            calls += 1;
            return calls === 1 ? fail() : HttpResponse.json(OPTIONS);
          }),
        );
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);

        expect(await screen.findByText('passkeys.add.prepareFailed')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'passkeys.add.retry' }));

        const submit = await typeNameAndGetSubmit(user, 'Office laptop');
        expect(calls).toBe(2);
        expect(screen.queryByText('passkeys.add.prepareFailed')).not.toBeInTheDocument();
        expect(screen.queryByText('passkeys.add.retry')).not.toBeInTheDocument();
        expect(submit).toBeEnabled();
      });

      it('offers no retry for a refusal such as a 400', async () => {
        server.use(
          http.get(API, () => HttpResponse.json([])),
          http.post(`${API}/register/options`, () => problem('SomethingNew', 'refused')),
        );
        const { user } = render(<PasskeysCard />);
        await openAddDialog(user);

        expect(await screen.findByText('refused')).toBeInTheDocument();
        expect(screen.queryByText('passkeys.add.retry')).not.toBeInTheDocument();
      });
    });

    it('asks for fresh options when the sealed state has expired', async () => {
      const seen = serve();
      server.use(http.post(`${API}/register`, () => problem('PasskeyStateExpired')));
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      fireEvent.click(await typeNameAndGetSubmit(user, 'Office laptop'));

      expect(await screen.findByRole('alert')).toHaveTextContent('passkeys.errors.stateExpired');
      await waitFor(() => expect(seen.optionsCalls).toBe(2));
    });

    it('explains a sign-in that is too old and offers to sign in again', async () => {
      server.use(
        http.get(API, () => HttpResponse.json([])),
        http.post(`${API}/register/options`, () => problem('PasskeyReauthRequired')),
      );
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);

      expect(await screen.findByText('passkeys.add.reauthBody')).toBeInTheDocument();
      expect(screen.queryByLabelText('passkeys.add.nameLabel')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'passkeys.add.reauthButton' }));
      // From the signed-in account, so a shared machine does not switch user.
      expect(startSignIn).toHaveBeenCalledWith('/profile', { loginHint: 'ann' });
      expect(create).not.toHaveBeenCalled();
    });

    it('shows the limit message when the user already has the maximum', async () => {
      server.use(
        http.get(API, () => HttpResponse.json([])),
        http.post(`${API}/register/options`, () => problem('PasskeyLimitReached')),
      );
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);

      expect(await screen.findByText('passkeys.errors.limitReached')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'passkeys.add.submit' })).toBeDisabled();
    });

    it('says the browser has no passkey support, and asks the server for nothing', async () => {
      vi.stubGlobal('PublicKeyCredential', undefined);
      const seen = serve();
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);

      expect(await screen.findByText('passkeys.add.unsupported')).toBeInTheDocument();
      expect(screen.queryByLabelText('passkeys.add.nameLabel')).not.toBeInTheDocument();
      expect(seen.optionsCalls).toBe(0);
    });

    it('is unsupported without parseCreationOptionsFromJSON', async () => {
      class NoParser {}
      vi.stubGlobal('PublicKeyCredential', NoParser);
      const seen = serve();
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      expect(await screen.findByText('passkeys.add.unsupported')).toBeInTheDocument();
      expect(seen.optionsCalls).toBe(0);
    });

    it('is unsupported without navigator.credentials.create', async () => {
      Object.defineProperty(navigator, 'credentials', { value: {}, configurable: true });
      serve();
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      expect(await screen.findByText('passkeys.add.unsupported')).toBeInTheDocument();
    });

    it('is supported without toJSON on the credential class: the response is written by hand', async () => {
      class NoJson {
        static parseCreationOptionsFromJSON = parse;
      }
      vi.stubGlobal('PublicKeyCredential', NoJson);
      serve();
      const { user } = render(<PasskeysCard />);
      await openAddDialog(user);
      expect(await screen.findByLabelText('passkeys.add.nameLabel')).toBeInTheDocument();
      expect(screen.queryByText('passkeys.add.unsupported')).not.toBeInTheDocument();
    });
  });

  describe('rename and delete', () => {
    it('starts each rename from the name of the passkey chosen, also after a cancel', async () => {
      serve([passkey(), passkey({ id: 'p2', name: 'Office PC', synced: false })]);
      const { user } = render(<PasskeysCard />);

      await user.click(
        (await screen.findAllByRole('button', { name: 'passkeys.rename.button' }))[0],
      );
      expect(await screen.findByLabelText('passkeys.add.nameLabel')).toHaveValue(
        'MacBook Touch ID',
      );
      await user.type(screen.getByLabelText('passkeys.add.nameLabel'), ' typed but cancelled');
      await user.click(screen.getByRole('button', { name: 'common:actions.cancel' }));
      await waitFor(() =>
        expect(screen.queryByLabelText('passkeys.add.nameLabel')).not.toBeInTheDocument(),
      );

      await user.click(screen.getAllByRole('button', { name: 'passkeys.rename.button' })[1]);
      expect(await screen.findByLabelText('passkeys.add.nameLabel')).toHaveValue('Office PC');
    });

    it('hides the X, and ignores Esc, while the rename is being saved', async () => {
      serve([passkey()]);
      server.use(
        http.put(`${API}/:id`, async () => {
          await delay(300);
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const { user } = render(<PasskeysCard />);
      await user.click(await screen.findByRole('button', { name: 'passkeys.rename.button' }));
      expect(await screen.findByLabelText('Close modal')).toBeInTheDocument();
      await user.type(screen.getByLabelText('passkeys.add.nameLabel'), ' 2');
      await user.click(screen.getByRole('button', { name: 'common:actions.save' }));

      await waitFor(() => expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument());
      await user.keyboard('{Escape}');
      expect(screen.getByLabelText('passkeys.add.nameLabel')).toBeInTheDocument();
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.renamed'));
    });

    it('renames from the current name and refreshes the list', async () => {
      const seen = serve([passkey()]);
      const { user } = render(<PasskeysCard />);
      await user.click(await screen.findByRole('button', { name: 'passkeys.rename.button' }));

      const field = await screen.findByLabelText('passkeys.add.nameLabel');
      expect(field).toHaveValue('MacBook Touch ID');
      const save = screen.getByRole('button', { name: 'common:actions.save' });
      expect(save).toBeDisabled(); // unchanged
      await user.clear(field);
      await user.type(field, 'Work Mac');
      server.use(http.get(API, () => HttpResponse.json([passkey({ name: 'Work Mac' })])));
      await user.click(save);

      await waitFor(() => expect(seen.renamed).toEqual([{ id: 'p1', name: 'Work Mac' }]));
      expect(await screen.findByText('Work Mac')).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.renamed');
    });

    it('shows a rename the API refuses inline', async () => {
      serve([passkey()]);
      server.use(http.put(`${API}/:id`, () => problem('PasskeyNameInvalid')));
      const { user } = render(<PasskeysCard />);
      await user.click(await screen.findByRole('button', { name: 'passkeys.rename.button' }));
      await user.type(await screen.findByLabelText('passkeys.add.nameLabel'), ' 2');
      await user.click(screen.getByRole('button', { name: 'common:actions.save' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('passkeys.errors.nameInvalid');
    });

    it('asks before deleting, and only then calls the API', async () => {
      const deleted: string[] = [];
      serve([passkey()]);
      server.use(
        http.delete(`${API}/:id`, ({ params }) => {
          deleted.push(String(params.id));
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const { user } = render(<PasskeysCard />);
      await user.click(await screen.findByRole('button', { name: 'passkeys.delete.button' }));

      const dialog = screen.getByText('passkeys.delete.title').closest('dialog')!;
      expect(deleted).toEqual([]);
      server.use(http.get(API, () => HttpResponse.json([])));
      await user.click(within(dialog).getByText('passkeys.delete.button'));

      await waitFor(() => expect(deleted).toEqual(['p1']));
      expect(await screen.findByText('passkeys.empty')).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('passkeys.toasts.deleted');
    });

    it('cancelling the confirmation deletes nothing', async () => {
      const deleted: string[] = [];
      serve([passkey()]);
      server.use(
        http.delete(`${API}/:id`, ({ params }) => {
          deleted.push(String(params.id));
          return new HttpResponse(null, { status: 204 });
        }),
      );
      const { user } = render(<PasskeysCard />);
      await user.click(await screen.findByRole('button', { name: 'passkeys.delete.button' }));
      await user.click(screen.getByText('actions.cancel'));
      expect(screen.queryByText('passkeys.delete.title')).not.toBeInTheDocument();
      expect(deleted).toEqual([]);
    });

    it('treats a passkey that is already gone (404) as deleted: closes, no error, list refreshes', async () => {
      serve([passkey()]);
      server.use(
        http.delete(`${API}/:id`, () =>
          HttpResponse.json({ title: 'Not Found', status: 404 }, { status: 404 }),
        ),
      );
      const { user } = render(<PasskeysCard />);
      await user.click(await screen.findByRole('button', { name: 'passkeys.delete.button' }));
      const dialog = screen.getByText('passkeys.delete.title').closest('dialog')!;
      server.use(http.get(API, () => HttpResponse.json([])));
      await user.click(within(dialog).getByText('passkeys.delete.button'));

      expect(await screen.findByText('passkeys.empty')).toBeInTheDocument();
      expect(screen.queryByText('passkeys.delete.title')).not.toBeInTheDocument();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('still reports any other delete failure', async () => {
      serve([passkey()]);
      server.use(http.delete(`${API}/:id`, () => HttpResponse.json({}, { status: 500 })));
      const { user } = render(<PasskeysCard />);
      await user.click(await screen.findByRole('button', { name: 'passkeys.delete.button' }));
      const dialog = screen.getByText('passkeys.delete.title').closest('dialog')!;
      await user.click(within(dialog).getByText('passkeys.delete.button'));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('passkeys.toasts.deleteFailed'));
      expect(screen.getByText('passkeys.delete.title')).toBeInTheDocument();
    });

    it('closes the rename dialog when the passkey is gone (404), says so in our words, and refreshes', async () => {
      serve([passkey()]);
      server.use(
        http.put(`${API}/:id`, () =>
          HttpResponse.json(
            { title: 'Not Found', status: 404, detail: 'raw server text' },
            { status: 404 },
          ),
        ),
      );
      const { user } = render(<PasskeysCard />);
      await user.click(await screen.findByRole('button', { name: 'passkeys.rename.button' }));
      await user.type(await screen.findByLabelText('passkeys.add.nameLabel'), ' 2');
      server.use(http.get(API, () => HttpResponse.json([])));
      await user.click(screen.getByRole('button', { name: 'common:actions.save' }));

      expect(await screen.findByText('passkeys.empty')).toBeInTheDocument();
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('passkeys.toasts.renameGone'));
      expect(toast.error).not.toHaveBeenCalledWith('raw server text');
      await waitFor(() =>
        expect(screen.queryByLabelText('passkeys.add.nameLabel')).not.toBeInTheDocument(),
      );
    });

    it('does not rename to a name with control characters', async () => {
      const seen = serve([passkey()]);
      const { user } = render(<PasskeysCard />);
      await user.click(await screen.findByRole('button', { name: 'passkeys.rename.button' }));
      fireEvent.change(await screen.findByLabelText('passkeys.add.nameLabel'), {
        target: { value: 'Bad\u0007name' },
      });
      await user.click(screen.getByRole('button', { name: 'common:actions.save' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('passkeys.errors.nameInvalid');
      expect(seen.renamed).toEqual([]);
    });
  });

  describe('a failed background refresh', () => {
    it('keeps the cached table instead of replacing it with the load error', async () => {
      serve([passkey()]);
      const queryClient = createTestQueryClient();
      render(<PasskeysCard />, { queryClient });
      expect(await screen.findByText('MacBook Touch ID')).toBeInTheDocument();

      server.use(http.get(API, () => HttpResponse.json({}, { status: 500 })));
      await queryClient.invalidateQueries({ queryKey: ['passkeys', 'me'] });

      await waitFor(() =>
        expect(queryClient.getQueryState(['passkeys', 'me'])?.status).toBe('error'),
      );
      expect(screen.getByText('MacBook Touch ID')).toBeInTheDocument();
      expect(screen.queryByText('passkeys.loadFailed')).not.toBeInTheDocument();
    });
  });
});
