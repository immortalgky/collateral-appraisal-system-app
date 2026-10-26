import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { redirectToLogin } from '../utils/auth';
import LoginPage from './LoginPage';

type Listener = (event: { data: unknown }) => void;
const channel = vi.hoisted(() => ({
  listeners: [] as Listener[],
  addEventListener: (_type: string, l: Listener) => channel.listeners.push(l),
  removeEventListener: (_type: string, l: Listener) => {
    channel.listeners = channel.listeners.filter(x => x !== l);
  },
}));
vi.mock('../utils/authChannel', () => ({ authChannel: channel }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, o?: { name?: string }) => (o?.name ? `${key}:${o.name}` : key),
  }),
}));
vi.mock('@shared/components/LanguageSwitcher', () => ({ default: () => null }));

const APP = 'https://app.example.com';
const API = 'https://api.example.com';
// `method` null: no method in the URL, the identity provider picks ("Not you?" names none).
const apiLogin = (path: string, hint?: string, method: string | null = 'password') =>
  `${API}/auth/login?returnUrl=${encodeURIComponent(APP + path)}${
    hint ? `&login_hint=${hint}` : ''
  }${method ? `&method=${method}` : ''}`;

let location: { origin: string; href: string; replace: ReturnType<typeof vi.fn> };

// Shows where the router thinks it is, so the tests can see the address the page leaves behind.
const WhereAmI = () => {
  const { pathname, search, state } = useLocation();
  return (
    <output data-testid="where">
      {pathname}
      {search}
      {state ? ` state:${JSON.stringify(state)}` : ''}
    </output>
  );
};

const renderAt = (url: string, state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', search: url, state }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>home</div>} />
        <Route path="/tasks" element={<div>tasks page</div>} />
      </Routes>
      <WhereAmI />
    </MemoryRouter>,
  );

const signIn = () => screen.getByRole('button', { name: 'interstitial.methods.password' });

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APP_URL', APP);
    vi.stubEnv('VITE_API_URL', API);
    location = { origin: APP, href: `${APP}/login`, replace: vi.fn() };
    vi.stubGlobal('location', location);
    sessionStorage.clear();
    channel.listeners = [];
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('shows the first-visit page when nothing says why', () => {
    renderAt('');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Collateral Appraisal System',
    );
    expect(screen.queryByText('interstitial.saved')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  describe('sign-in methods (the cas-login-method cookie)', () => {
    const passkey = () => screen.getByRole('button', { name: 'interstitial.methods.passkey' });
    const order = () => screen.getAllByRole('button').map(b => b.textContent);
    const clearCookie = () => {
      document.cookie = 'cas-login-method=; Max-Age=0; Path=/';
    };
    beforeEach(clearCookie);
    afterEach(clearCookie);

    it('puts the password first, with the passkey hint, when no method was used yet', () => {
      renderAt('');
      expect(order()).toEqual(['interstitial.methods.password', 'interstitial.methods.passkey']);
      expect(screen.getByText('interstitial.noPasskeyYet')).toBeInTheDocument();
      expect(screen.queryByText('interstitial.passkeyFirst')).not.toBeInTheDocument();
    });

    it('puts the passkey first, and says why, when it was used last', () => {
      document.cookie = 'cas-login-method=passkey; Path=/';
      renderAt('');
      expect(order()).toEqual(['interstitial.methods.passkey', 'interstitial.methods.password']);
      expect(screen.getByText('interstitial.passkeyFirst')).toBeInTheDocument();
      expect(screen.queryByText('interstitial.noPasskeyYet')).not.toBeInTheDocument();
    });

    it('keeps the password first when that was used last, and ignores an unknown value', () => {
      document.cookie = 'cas-login-method=password; Path=/';
      const first = renderAt('');
      expect(order()[0]).toBe('interstitial.methods.password');
      first.unmount();
      document.cookie = 'cas-login-method=fido; Path=/';
      renderAt('');
      expect(order()[0]).toBe('interstitial.methods.password');
    });

    it('each button starts its own method', () => {
      document.cookie = 'cas-login-method=passkey; Path=/';
      renderAt('?returnUrl=%2Ftasks');
      fireEvent.click(passkey());
      expect(location.href).toBe(apiLogin('/tasks', undefined, 'passkey'));
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/tasks', undefined, 'password'));
    });

    it('puts "Continue as" on the first button only, and both start from the known user', () => {
      document.cookie = 'cas-login-method=passkey; Path=/';
      sessionStorage.setItem(
        'cas-return',
        JSON.stringify({
          path: '/tasks',
          reason: 'idle',
          account: { username: 'somchai.u', displayName: 'Somchai U.', initials: 'SU' },
        }),
      );
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      expect(order()[0]).toBe('interstitial.continueAs:Somchai U.');
      expect(order()[1]).toBe('interstitial.methods.password');
      fireEvent.click(screen.getAllByRole('button')[0]);
      expect(location.href).toBe(apiLogin('/tasks', 'somchai.u', 'passkey'));
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/tasks', 'somchai.u', 'password'));
    });
  });

  it.each([
    ['idle', 'interstitial.idle.title'],
    ['ended', 'interstitial.ended.title'],
    ['signed-out', 'interstitial.signedOut.title'],
  ])('shows the %s state', (reason, title) => {
    renderAt(`?reason=${reason}`);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
  });

  it('treats an unknown reason as a first visit', () => {
    renderAt('?reason=whatever');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Collateral Appraisal System',
    );
  });

  it('says what happens to saved work only after idle or ended', () => {
    const { unmount } = renderAt('?reason=idle');
    expect(screen.getByText('interstitial.saved')).toBeInTheDocument();
    expect(screen.getByText('interstitial.sharedDevice')).toBeInTheDocument();
    unmount();
    renderAt('?reason=signed-out');
    expect(screen.queryByText('interstitial.saved')).not.toBeInTheDocument();
  });

  it('starts nothing by itself: the only navigation is the click', () => {
    vi.useFakeTimers();
    renderAt('?reason=idle&returnUrl=%2Ftasks');
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(location.href).toBe(`${APP}/login`);
    expect(location.replace).not.toHaveBeenCalled();

    fireEvent.click(signIn());
    expect(location.href).toBe(apiLogin('/tasks'));
  });

  it('comes back to the page ProtectedRoute remembered when there is no returnUrl', () => {
    renderAt('', { from: '/appraisals/7?tab=2' });
    fireEvent.click(signIn());
    expect(location.href).toBe(apiLogin('/appraisals/7'));
  });

  it.each(['https://evil.example.org/steal', '//evil.example.org/steal', '/login'])(
    'never signs in back to %s',
    returnUrl => {
      renderAt(`?returnUrl=${encodeURIComponent(returnUrl)}`);
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/'));
    },
  );

  it.each(['http://[', 'https://a b/', 'http://x:99999', '//[x', 'http://%'])(
    'renders, with the sign-in button, for a malformed returnUrl (%s)',
    returnUrl => {
      renderAt(`?reason=idle&returnUrl=${encodeURIComponent(returnUrl)}`);
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/'));
    },
  );

  describe('a signed-in visitor', () => {
    const signedIn = () =>
      useAuthStore.setState({ user: { id: '1' } as never, isAuthenticated: true });

    it('goes home when there is nowhere else to go', () => {
      signedIn();
      renderAt('');
      expect(screen.getByText('home')).toBeInTheDocument();
    });

    it('goes to the safe returnUrl, not home', () => {
      signedIn();
      renderAt('?returnUrl=%2Ftasks');
      expect(screen.getByText('tasks page')).toBeInTheDocument();
    });

    it('never goes to an unsafe returnUrl', () => {
      signedIn();
      renderAt('?returnUrl=%2F.%2F%2Fevil.example.org');
      expect(screen.getByText('home')).toBeInTheDocument();
    });

    it('goes back after a 401 only once per 30 seconds, then stays and shows the button', () => {
      vi.useFakeTimers();
      signedIn();
      const first = renderAt('?reason=ended&returnUrl=%2Ftasks');
      expect(screen.getByText('tasks page')).toBeInTheDocument();
      first.unmount();

      // Sent back here again straight away: the 401 persists, so do not bounce again.
      renderAt('?reason=ended&returnUrl=%2Ftasks');
      expect(screen.queryByText('tasks page')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.ended.title',
      );
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/tasks'));
    });

    it('ends on the return page, not on /login with the dashboard drawn under it', () => {
      vi.unstubAllGlobals(); // the real window.location, driven by a real browser router
      window.history.pushState(null, '', '/login?reason=ended&returnUrl=%2Ftasks');
      signedIn();
      render(
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/tasks" element={<div>tasks page</div>} />
          </Routes>
        </BrowserRouter>,
      );
      expect(screen.getByText('tasks page')).toBeInTheDocument();
      expect(window.location.pathname).toBe('/tasks');
    });

    it('stays on /login, minus the reason, when it is not going back', () => {
      vi.unstubAllGlobals();
      window.history.pushState(null, '', '/login?reason=ended&returnUrl=%2Ftasks');
      signedIn();
      sessionStorage.setItem('cas-login-bounce', String(Date.now())); // just sent back once
      render(
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/tasks" element={<div>tasks page</div>} />
          </Routes>
        </BrowserRouter>,
      );
      expect(signIn()).toBeInTheDocument();
      expect(window.location.pathname).toBe('/login');
      expect(window.location.search).toBe('?returnUrl=%2Ftasks');
    });

    it('hands a different signed-in user over to the home page, the same user to the page', () => {
      signedIn(); // user '1'
      sessionStorage.setItem('cas-return', JSON.stringify({ path: '/tasks', userId: 'u0' }));
      const stranger = renderAt('?returnUrl=%2Ftasks');
      expect(screen.getByText('home')).toBeInTheDocument();
      stranger.unmount();
      sessionStorage.removeItem('cas-login-bounce'); // one bounce per 30 s

      sessionStorage.setItem('cas-return', JSON.stringify({ path: '/tasks', userId: '1' }));
      renderAt('?returnUrl=%2Ftasks');
      expect(screen.getByText('tasks page')).toBeInTheDocument();
    });

    it("sends a different user who typed the saved user's page home, even via router state", () => {
      signedIn(); // user '1'; the saved user was 'u0' on the same page
      sessionStorage.setItem('cas-return', JSON.stringify({ path: '/tasks', userId: 'u0' }));
      renderAt('', { from: '/tasks' });
      expect(screen.getByText('home')).toBeInTheDocument();
    });

    it('forgets what was saved when it hands a signed-in visitor back', () => {
      signedIn();
      sessionStorage.setItem('cas-return', JSON.stringify({ path: '/tasks', label: 'Tasks' }));
      renderAt('?returnUrl=%2Ftasks');
      expect(sessionStorage.getItem('cas-return')).toBeNull();
    });

    it('keeps what was saved when it stays (inside the quiet period)', () => {
      signedIn();
      sessionStorage.setItem('cas-login-bounce', String(Date.now()));
      sessionStorage.setItem('cas-return', JSON.stringify({ path: '/tasks', label: 'Tasks' }));
      renderAt('?returnUrl=%2Ftasks');
      expect(sessionStorage.getItem('cas-return')).not.toBeNull();
    });

    it('goes back again once the quiet period has passed', () => {
      vi.useFakeTimers();
      signedIn();
      renderAt('?returnUrl=%2Ftasks').unmount();
      vi.advanceTimersByTime(31_000);
      renderAt('?returnUrl=%2Ftasks');
      expect(screen.getByText('tasks page')).toBeInTheDocument();
    });

    it('does not limit a visit that did not come from a 401', () => {
      signedIn();
      renderAt('').unmount();
      renderAt('');
      expect(screen.getByText('home')).toBeInTheDocument();
    });

    it('survives blocked storage without looping', () => {
      signedIn();
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      renderAt('?returnUrl=%2Ftasks');
      expect(screen.getByText('tasks page')).toBeInTheDocument();
      vi.restoreAllMocks();
    });
  });

  it('shows the signed-out state once, then removes the flag', () => {
    sessionStorage.setItem('cas-signed-out', '1');
    renderAt('');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'interstitial.signedOut.title',
    );
    expect(sessionStorage.getItem('cas-signed-out')).toBeNull();
  });

  it('ignores the flag when the URL says where it is going, and still removes it', () => {
    sessionStorage.setItem('cas-signed-out', '1');
    renderAt('?returnUrl=%2Ftasks');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Collateral Appraisal System',
    );
    expect(sessionStorage.getItem('cas-signed-out')).toBeNull();
  });

  it('removes the flag even when an explicit reason wins', () => {
    sessionStorage.setItem('cas-signed-out', '1');
    renderAt('?reason=idle');
    expect(sessionStorage.getItem('cas-signed-out')).toBeNull();
  });

  it('drops the reason from the address so a reload shows the generic page, keeping returnUrl and state', () => {
    renderAt('?reason=idle&returnUrl=%2Ftasks&x=1', { from: '/tasks' });
    // Still shown for this visit...
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('interstitial.idle.title');
    // ...but no longer in the address the router (and the address bar) hold.
    expect(screen.getByTestId('where')).toHaveTextContent(
      '/login?returnUrl=%2Ftasks&x=1 state:{"from":"/tasks"}',
    );
  });

  it('leaves the address alone when there is no reason', () => {
    renderAt('?returnUrl=%2Ftasks');
    expect(screen.getByTestId('where')).toHaveTextContent('/login?returnUrl=%2Ftasks');
  });

  it('lets an explicit reason win over the flag', () => {
    sessionStorage.setItem('cas-signed-out', '1');
    renderAt('?reason=idle');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('interstitial.idle.title');
  });

  it('names the page to return to when it was saved for that page', () => {
    sessionStorage.setItem(
      'cas-return',
      JSON.stringify({ path: '/appraisals/1', label: 'Appraisal 69000125' }),
    );
    renderAt('?reason=idle&returnUrl=%2Fappraisals%2F1');
    expect(screen.getByText('Appraisal 69000125')).toBeInTheDocument();
    expect(screen.getByText('interstitial.returnTo')).toBeInTheDocument();
  });

  describe('Continue as (a session that timed out under a known user)', () => {
    const account = { username: 'somchai.u', displayName: 'Somchai U.', initials: 'SU' };
    const save = (extra: object = {}) =>
      sessionStorage.setItem(
        'cas-return',
        JSON.stringify({ path: '/tasks', label: 'Tasks', reason: 'idle', account, ...extra }),
      );

    it('shows the masked name with initials, the return line and both buttons', () => {
      save();
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      expect(screen.getByText('Somchai U.')).toBeInTheDocument();
      expect(screen.getByText('SU')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'interstitial.continueAs:Somchai U.' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'interstitial.notYou' })).toBeInTheDocument();
    });

    it('keeps the saved-work line and drops the shared-device line (the "not you" link covers it)', () => {
      save();
      const { unmount } = renderAt('?reason=idle&returnUrl=%2Ftasks');
      expect(screen.getByText('interstitial.saved')).toBeInTheDocument();
      expect(screen.queryByText('interstitial.sharedDevice')).not.toBeInTheDocument();
      unmount();
      save({ reason: 'ended' });
      renderAt('?reason=ended&returnUrl=%2Ftasks');
      expect(screen.getByText('interstitial.contactAdmin')).toBeInTheDocument();
    });

    it('continues with the username as login_hint and the return path', () => {
      save();
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.continueAs:Somchai U.' }));
      expect(location.href).toBe(apiLogin('/tasks', 'somchai.u'));
    });

    it('"not you" forgets the user and signs in at home with no hint', () => {
      save();
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.notYou' }));
      expect(location.href).toBe(apiLogin('/', undefined, null));
      expect(location.href).not.toContain('login_hint');
      // Nothing of A is left: a reload or Back returns home.
      expect(JSON.parse(sessionStorage.getItem('cas-return')!)).toEqual({
        path: '/',
        notYou: true,
      });
    });

    it('"not you" strips the address first, so a reload is a plain sign-in that returns home', () => {
      save();
      const hrefWhenStripped: string[] = [];
      const replaceState = vi
        .spyOn(window.history, 'replaceState')
        .mockImplementation(() => void hrefWhenStripped.push(location.href));
      const first = renderAt('?reason=idle&returnUrl=%2Ftasks');
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.notYou' }));
      // The history entry is kept as it is, only the address changes; all before the navigation.
      expect(replaceState).toHaveBeenCalledWith(window.history.state, '', '/login');
      expect(hrefWhenStripped).toEqual([`${APP}/login`]);
      expect(location.href).toBe(apiLogin('/', undefined, null));
      replaceState.mockRestore();
      first.unmount();

      location.href = '';
      renderAt(''); // the reloaded address
      expect(screen.queryByText('Somchai U.')).not.toBeInTheDocument();
      expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/'));
    });

    it('ignores a page named by router state after "Not you?" (the history entry still has it)', () => {
      sessionStorage.setItem('cas-return', JSON.stringify({ path: '/', notYou: true }));
      renderAt('', { from: '/tasks' });
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/'));
      // ...and the marker survives the page's own rewrite of the saved state, for the next reload.
      expect(JSON.parse(sessionStorage.getItem('cas-return')!).notYou).toBe(true);
    });

    it('"not you" removes the card and the Continue button before leaving', () => {
      save();
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.notYou' }));
      expect(screen.queryByText('Somchai U.')).not.toBeInTheDocument();
      expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /continueAs/ })).not.toBeInTheDocument();
      // Back from the identity provider via the back/forward cache: still a plain sign-in, at home.
      location.href = '';
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/'));
    });

    it('keeps the card and the saved user when ProtectedRoute names the page (Back, then a reload)', () => {
      save({ userId: 'u0' });
      renderAt('', { from: '/tasks' }); // the 401 had no header: no query, only router state
      expect(screen.getByText('Somchai U.')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.idle.title',
      );
      expect(JSON.parse(sessionStorage.getItem('cas-return')!)).toMatchObject({
        userId: 'u0',
        account,
        reason: 'idle',
      });
    });

    it('shows the card again after Back and a boot 401 (user unknown) for the same page', () => {
      save({ userId: 'u0' });
      Object.assign(location, { pathname: '/tasks', search: '', hash: '' });
      redirectToLogin(undefined, 'idle'); // what AuthInitializer does with the boot 401
      expect(location.href).toBe('/login?returnUrl=%2Ftasks&reason=idle');
      location.href = `${APP}/login`;
      renderAt('?returnUrl=%2Ftasks&reason=idle');
      expect(screen.getByText('Somchai U.')).toBeInTheDocument();
      expect(JSON.parse(sessionStorage.getItem('cas-return')!)).toMatchObject({ userId: 'u0' });
    });

    it('still shows the card when the card page is reloaded (the reason left the address)', () => {
      save({ userId: 'u0' });
      renderAt('?returnUrl=%2Ftasks');
      expect(screen.getByText('Somchai U.')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('keeps the user through the page rewriting its own saved state', () => {
      save();
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      expect(JSON.parse(sessionStorage.getItem('cas-return')!).account).toEqual(account);
    });

    it('is the plain method buttons without a saved user', () => {
      save({ account: undefined });
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(signIn()).toBeInTheDocument();
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/tasks'));
    });

    it('is not shown for a signed-out visit or when the user was saved for another page', () => {
      save();
      const { unmount } = renderAt('?reason=signed-out&returnUrl=%2Ftasks');
      expect(screen.queryByText('Somchai U.')).not.toBeInTheDocument();
      unmount();
      renderAt('?reason=idle&returnUrl=%2Fother');
      expect(screen.queryByText('Somchai U.')).not.toBeInTheDocument();
      expect(signIn()).toBeInTheDocument();
    });
  });

  it('hides the line when the saved name belongs to another page', () => {
    sessionStorage.setItem(
      'cas-return',
      JSON.stringify({ path: '/appraisals/1', label: 'Appraisal 69000125' }),
    );
    renderAt('?reason=idle&returnUrl=%2Fappraisals%2F2');
    expect(screen.queryByText('Appraisal 69000125')).not.toBeInTheDocument();
    expect(screen.queryByText('interstitial.returnTo')).not.toBeInTheDocument();
    expect(screen.getByText('interstitial.saved')).toBeInTheDocument();
  });

  describe("with a bare /login (the identity provider's back link)", () => {
    const save = (saved: object) => sessionStorage.setItem('cas-return', JSON.stringify(saved));

    it('restores the saved page, name and reason', () => {
      save({ path: '/appraisals/1', label: 'Appraisal 69000125', reason: 'idle' });
      renderAt('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.idle.title',
      );
      expect(screen.getByText('Appraisal 69000125')).toBeInTheDocument();
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/appraisals/1'));
    });

    it('restores a first visit that only had router state, as after "choose another method"', () => {
      const { unmount } = renderAt('', { from: '/tasks' });
      unmount();
      renderAt('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Collateral Appraisal System',
      );
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/tasks'));
    });

    it('restores a reason that came in the query', () => {
      const { unmount } = renderAt('?reason=ended&returnUrl=%2Ftasks');
      unmount();
      renderAt('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.ended.title',
      );
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/tasks'));
    });

    it('does not let an older saved reason leak into a later first visit', () => {
      save({ path: '/appraisals/1', label: 'Appraisal 69000125', reason: 'idle' });
      const { unmount } = renderAt('', { from: '/tasks' });
      unmount();
      renderAt('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Collateral Appraisal System',
      );
      expect(screen.queryByText('Appraisal 69000125')).not.toBeInTheDocument();
    });

    it('does not keep "signed out" for a later bare /login', () => {
      sessionStorage.setItem('cas-signed-out', '1');
      const { unmount } = renderAt('', { from: '/tasks' });
      unmount();
      renderAt('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Collateral Appraisal System',
      );
    });

    it('still works when storage is blocked', () => {
      const boom = () => {
        throw new Error('blocked');
      };
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.idle.title',
      );
      vi.restoreAllMocks();
    });

    it('is a first visit when nothing is saved', () => {
      renderAt('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Collateral Appraisal System',
      );
    });

    it('still validates the saved path', () => {
      save({ path: 'https://evil.example.org/steal', reason: 'ended' });
      renderAt('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.ended.title',
      );
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/'));
    });

    it('ignores a saved reason it does not know', () => {
      save({ path: '/tasks', reason: 'whatever' });
      renderAt('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Collateral Appraisal System',
      );
    });

    it('lets the signed-out flag win over the saved reason', () => {
      save({ path: '/tasks', reason: 'idle' });
      sessionStorage.setItem('cas-signed-out', '1');
      renderAt('');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.signedOut.title',
      );
    });

    it('does not use the saved state when the URL or router state already say where to go', () => {
      save({ path: '/appraisals/1', label: 'Appraisal 69000125', reason: 'idle' });
      const { unmount } = renderAt('?returnUrl=%2Ftasks');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Collateral Appraisal System',
      );
      unmount();
      renderAt('', { from: '/tasks' });
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Collateral Appraisal System',
      );
    });
  });

  describe('when another tab signs in', () => {
    it('does not treat the saved user as the one who asked for a different page', () => {
      sessionStorage.setItem('cas-return', JSON.stringify({ path: '/tasks', userId: 'u1' }));
      renderAt('?returnUrl=%2Fother');
      act(() => channel.listeners.forEach(l => l({ data: { type: 'user', id: 'u1' } })));
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.otherTab.goNow' }));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/`);
    });

    const announce = (id = 'u1') =>
      act(() => channel.listeners.forEach(l => l({ data: { type: 'user', id } })));
    // What redirectToLogin saved when u1's session ended.
    const endedFor = (path: string, label = '') =>
      sessionStorage.setItem('cas-return', JSON.stringify({ path, label, userId: 'u1' }));

    it('shows it and goes back to the page by itself', () => {
      vi.useFakeTimers();
      endedFor('/tasks');
      renderAt('?returnUrl=%2Ftasks');
      announce();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.otherTab.title',
      );
      expect(location.replace).not.toHaveBeenCalled();

      act(() => void vi.advanceTimersByTime(5000));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/tasks`);
    });

    it('goes at once on "go now"', () => {
      endedFor('/tasks');
      renderAt('?returnUrl=%2Ftasks');
      announce();
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.otherTab.goNow' }));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/tasks`);
    });

    it('returns by itself at most once per 30 seconds, whoever triggers it', () => {
      vi.useFakeTimers();
      endedFor('/tasks');
      const first = renderAt('?returnUrl=%2Ftasks');
      announce();
      act(() => void vi.advanceTimersByTime(5000));
      expect(location.replace).toHaveBeenCalledTimes(1);
      first.unmount();

      // Back here straight away (two tabs sending each other back): no second automatic return.
      location.replace.mockClear();
      endedFor('/tasks');
      renderAt('?returnUrl=%2Ftasks');
      announce();
      act(() => void vi.advanceTimersByTime(5000));
      expect(location.replace).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.otherTab.title',
      );
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.otherTab.goNow' }));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/tasks`);
    });

    it('keeps an automatic return that was granted, when another message arrives meanwhile', () => {
      vi.useFakeTimers();
      endedFor('/tasks');
      renderAt('?returnUrl=%2Ftasks');
      announce(); // grants the return and starts the clock
      act(() => void vi.advanceTimersByTime(500));
      announce(); // inside the window now, so this one is not "auto" itself
      act(() => void vi.advanceTimersByTime(5000));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/tasks`);
    });

    it('shows the spinner and "taking you back" only when it will really go by itself', () => {
      endedFor('/tasks');
      renderAt('?returnUrl=%2Ftasks');
      announce();
      expect(document.body.innerHTML).toContain('#spinner');
      expect(screen.getByText('interstitial.otherTab.noRetype')).toBeInTheDocument();
    });

    it('is a static message with the button, and no spinner, when it will not go by itself', () => {
      sessionStorage.setItem('cas-login-bounce', String(Date.now()));
      endedFor('/tasks');
      renderAt('?returnUrl=%2Ftasks');
      announce();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.otherTab.title',
      );
      expect(screen.getByText('interstitial.otherTab.pressToReturn')).toBeInTheDocument();
      expect(screen.queryByText('interstitial.otherTab.returning')).not.toBeInTheDocument();
      expect(screen.queryByText('interstitial.otherTab.noRetype')).not.toBeInTheDocument();
      expect(document.body.innerHTML).not.toContain('#spinner');
      expect(
        screen.getByRole('button', { name: 'interstitial.otherTab.goNow' }),
      ).toBeInTheDocument();
    });

    it('returns by itself again after the quiet period', () => {
      vi.useFakeTimers();
      sessionStorage.setItem('cas-login-bounce', String(Date.now()));
      vi.advanceTimersByTime(31_000);
      endedFor('/tasks');
      renderAt('?returnUrl=%2Ftasks');
      announce();
      act(() => void vi.advanceTimersByTime(5000));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/tasks`);
    });

    it('names the page when the same user signed in', () => {
      endedFor('/tasks', 'Tasks');
      renderAt('?returnUrl=%2Ftasks');
      announce();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it("sends a DIFFERENT user home, never to the previous user's page, and does not name it", () => {
      vi.useFakeTimers();
      endedFor('/tasks', 'Tasks');
      renderAt('?returnUrl=%2Ftasks');
      announce('u2');
      expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
      expect(screen.getByText('interstitial.otherTab.returning')).toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(5000));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/`);
    });

    it('sends the user home when no signed-out user was saved', () => {
      renderAt('?returnUrl=%2Ftasks');
      announce();
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.otherTab.goNow' }));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/`);
    });

    it('never goes to another origin', () => {
      endedFor('/tasks');
      renderAt('?returnUrl=https%3A%2F%2Fevil.example.org%2Fx');
      announce();
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.otherTab.goNow' }));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/`);
    });

    it.each([
      '?returnUrl=%2F.%2F%2Fevil.example.org',
      '?returnUrl=%2F..%2F%2Fevil.example.org',
      '?returnUrl=%2Fa%2F..%2F%2Fevil.example.org',
      '?returnUrl=%2F%5Cevil.example.org',
      '?returnUrl=%2F%2Fevil.example.org',
    ])('never goes off-site, whatever the returnUrl (%s)', query => {
      endedFor('/tasks');
      renderAt(query);
      announce();
      fireEvent.click(screen.getByRole('button', { name: 'interstitial.otherTab.goNow' }));
      expect(location.replace).toHaveBeenCalledWith(`${APP}/`);
    });

    it('ignores unrelated channel messages', () => {
      renderAt('');
      act(() => channel.listeners.forEach(l => l({ data: { type: 'other' } })));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Collateral Appraisal System',
      );
    });

    it('switches to the signed-out page when another tab signs out', () => {
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      act(() => channel.listeners.forEach(l => l({ data: { type: 'logout' } })));
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.signedOut.title',
      );
      expect(screen.queryByText('interstitial.saved')).not.toBeInTheDocument();
    });

    it('forgets the timed-out user when another tab signs out, so a bare /login offers no card', () => {
      sessionStorage.setItem(
        'cas-return',
        JSON.stringify({
          path: '/tasks',
          reason: 'idle',
          userId: 'u0',
          account: { username: 'a', displayName: 'Ann L.', initials: 'AL' },
        }),
      );
      const first = renderAt('?reason=idle&returnUrl=%2Ftasks');
      act(() => channel.listeners.forEach(l => l({ data: { type: 'logout' } })));
      expect(JSON.parse(sessionStorage.getItem('cas-return')!)).toEqual({
        path: '/',
        notYou: true,
      });
      first.unmount();

      renderAt('');
      expect(screen.queryByText('Ann L.')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    it("treats another tab's sign-out as an explicit one: sign in at home, no page, no hint", () => {
      sessionStorage.setItem(
        'cas-return',
        JSON.stringify({
          path: '/tasks',
          label: 'Tasks',
          reason: 'idle',
          userId: 'u0',
          account: { username: 'ann', displayName: 'Ann L.', initials: 'AL' },
        }),
      );
      const replaceState = vi.spyOn(window.history, 'replaceState');
      renderAt('?reason=idle&returnUrl=%2Ftasks');
      expect(screen.getByText('Ann L.')).toBeInTheDocument();
      act(() => channel.listeners.forEach(l => l({ data: { type: 'logout' } })));
      expect(replaceState).toHaveBeenCalledWith(window.history.state, '', '/login');
      replaceState.mockRestore();
      expect(screen.queryByText('Ann L.')).not.toBeInTheDocument();
      expect(screen.queryByText('Tasks')).not.toBeInTheDocument();
      fireEvent.click(signIn());
      expect(location.href).toBe(apiLogin('/'));
      expect(location.href).not.toContain('login_hint');
    });

    it('cancels the countdown when a sign-out follows the sign-in', () => {
      vi.useFakeTimers();
      renderAt('?returnUrl=%2Ftasks');
      announce();
      act(() => channel.listeners.forEach(l => l({ data: { type: 'logout' } })));
      act(() => void vi.advanceTimersByTime(5000));
      expect(location.replace).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'interstitial.signedOut.title',
      );
    });

    it('stops listening when the page goes away', () => {
      const { unmount } = renderAt('');
      expect(channel.listeners).toHaveLength(1);
      unmount();
      expect(channel.listeners).toHaveLength(0);
    });
  });
});
