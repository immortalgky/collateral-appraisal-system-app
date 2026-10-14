import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../store';
import { useMenuStore } from '@features/menuManagement/store';
import type { MenuTreeNode } from '@features/menuManagement/types';
import {
  clearSavedReturn,
  hopToCanonicalOrigin,
  isLoginPath,
  isSavedUserOrUnknown,
  isSavedUserStrict,
  readSavedReturn,
  sameOriginPath,
  saveReturn,
  redirectToLogin,
  startSignIn,
} from './auth';

function stubLocation(url: string) {
  const u = new URL(url);
  const location = {
    origin: u.origin,
    pathname: u.pathname,
    search: u.search,
    hash: u.hash,
    href: u.href,
    replace: vi.fn(),
  };
  vi.stubGlobal('location', location);
  return location;
}

const menuItem = (
  path: string | null,
  en: string,
  children: MenuTreeNode[] = [],
): MenuTreeNode => ({
  id: en,
  itemKey: en,
  path,
  iconName: 'x',
  iconStyle: 'solid',
  iconColor: null,
  sortOrder: 0,
  labels: { en, th: `${en}-th` },
  canEdit: false,
  children,
});

const login = (query: Record<string, string>) => `/login?${new URLSearchParams(query)}`;

describe('redirectToLogin', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com');
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('goes to the sign-in page, not the API, with the current page as returnUrl', () => {
    const location = stubLocation('https://app.example.com/appraisals/1');
    redirectToLogin();
    expect(location.href).toBe(login({ returnUrl: '/appraisals/1' }));
  });

  it('keeps only the pathname: a search or filter (a customer name) stays out of the address bar and storage', () => {
    const location = stubLocation('https://app.example.com/appraisals/search?name=Somchai#top');
    redirectToLogin(undefined, 'idle');
    expect(location.href).toBe(login({ returnUrl: '/appraisals/search', reason: 'idle' }));
    expect(readSavedReturn()?.path).toBe('/appraisals/search');
    expect(JSON.stringify(sessionStorage)).not.toContain('Somchai');
  });

  it('passes the reason on', () => {
    const location = stubLocation('https://app.example.com/tasks');
    redirectToLogin(undefined, 'idle');
    expect(location.href).toBe(login({ returnUrl: '/tasks', reason: 'idle' }));
  });

  it('with null, names no page at all and forgets any saved one', () => {
    const location = stubLocation('https://app.example.com/tasks');
    sessionStorage.setItem('cas-return', JSON.stringify({ path: '/tasks', label: 'Tasks' }));
    redirectToLogin(null, 'signed-out');
    expect(location.href).toBe('/login?reason=signed-out');
    expect(readSavedReturn()).toBeUndefined();
  });

  it('with null on another host name, still goes to the canonical origin', () => {
    const location = stubLocation('https://machine/tasks');
    redirectToLogin(null, 'signed-out');
    expect(location.replace).toHaveBeenCalledWith(
      'https://app.example.com/login?reason=signed-out',
    );
  });

  it('does nothing on the sign-in page itself, so a 401 there cannot loop', () => {
    const location = stubLocation('https://app.example.com/login?reason=idle');
    const before = location.href;
    redirectToLogin(undefined, 'ended');
    expect(location.href).toBe(before);
    expect(location.replace).not.toHaveBeenCalled();
  });

  it.each(['/login?reason=idle', '/login/', '/LOGIN', '/Login/', '/login/?x=1#top'])(
    'never returns to the login route (%s)',
    returnPath => {
      const location = stubLocation('https://app.example.com/tasks');
      redirectToLogin(returnPath);
      expect(location.href).toBe(login({ returnUrl: '/' }));
    },
  );

  it.each(['/Login', '/login/'])('does nothing on the sign-in page spelled %s', pathname => {
    const location = stubLocation(`https://app.example.com${pathname}`);
    const before = location.href;
    redirectToLogin(undefined, 'ended');
    expect(location.href).toBe(before);
  });

  it('does not take a page that merely starts with login for the login route', () => {
    const location = stubLocation('https://app.example.com/tasks');
    redirectToLogin('/loginhistory');
    expect(location.href).toBe(login({ returnUrl: '/loginhistory' }));
  });

  it('forgets the saved state once asked', () => {
    sessionStorage.setItem('cas-return', '{"path":"/x"}');
    clearSavedReturn();
    expect(readSavedReturn()).toBeUndefined();
  });

  it("goes straight to the canonical origin's sign-in page, with the state in the query", () => {
    const location = stubLocation('https://machine/appraisals?tab=2');
    const before = location.href;
    redirectToLogin(undefined, 'idle');
    expect(location.replace).toHaveBeenCalledWith(
      `https://app.example.com${login({ returnUrl: '/appraisals', reason: 'idle' })}`,
    );
    expect(location.href).toBe(before);
    expect(readSavedReturn()).toBeUndefined(); // sessionStorage would not cross origins anyway
  });

  it('comes back to an explicit returnPath instead of the current page', () => {
    const location = stubLocation('https://app.example.com/somewhere');
    redirectToLogin('/tasks/7?x=1');
    expect(location.href).toBe(login({ returnUrl: '/tasks/7' }));
  });

  it.each(['https://evil.example.org/steal', '//evil.example.org/steal'])(
    'never returns to another origin (%s)',
    returnPath => {
      const location = stubLocation('https://app.example.com/somewhere');
      redirectToLogin(returnPath);
      expect(location.href).toBe(login({ returnUrl: '/' }));
    },
  );

  describe('the page name it saves comes from the sidebar menu only', () => {
    beforeEach(() => {
      useMenuStore.setState({
        main: [
          menuItem('/', 'Home'),
          menuItem('/requests', 'Requests'),
          menuItem(null, 'Group', [
            menuItem('/appraisals', 'Appraisals', [menuItem('/appraisals/list', 'Appraisal list')]),
          ]),
        ],
      });
    });
    afterEach(() => useMenuStore.getState().reset());

    it('saves where it sent the user, the menu name and the reason', () => {
      stubLocation('https://app.example.com/appraisals/list');
      useAuthStore.setState({ user: { id: 'u1' } as never, isAuthenticated: true });
      redirectToLogin(undefined, 'idle');
      expect(readSavedReturn()).toEqual({
        path: '/appraisals/list',
        label: 'Appraisal list',
        reason: 'idle',
        userId: 'u1',
      });
      useAuthStore.setState({ user: null, isAuthenticated: false });
    });

    describe('who timed out', () => {
      const signedIn = (user: Record<string, string>) =>
        useAuthStore.setState({ user: { id: 'u1', ...user } as never, isAuthenticated: true });
      afterEach(() => useAuthStore.setState({ user: null, isAuthenticated: false }));

      it.each(['idle', 'ended'] as const)('is saved, masked, on %s', reason => {
        stubLocation('https://app.example.com/tasks');
        signedIn({ username: 'somchai.u', firstName: 'Somchai', lastName: 'Uthai' });
        redirectToLogin(undefined, reason);
        expect(readSavedReturn()?.account).toEqual({
          username: 'somchai.u',
          displayName: 'Somchai U.',
          initials: 'SU',
        });
        expect(JSON.stringify(sessionStorage)).not.toContain('Uthai');
      });

      it.each([
        ['สมชาย', 'ใจดี', 'สมชาย จ.', 'สจ'],
        ['เกียรติ', 'แก้วใส', 'เกียรติ ก.', 'กก'],
        ['Ann', 'เ', 'Ann เ.', 'Aเ'], // only a vowel: nothing better to show
      ])('skips Thai leading vowels: %s %s', (firstName, lastName, displayName, initials) => {
        stubLocation('https://app.example.com/tasks');
        signedIn({ username: 'u', firstName, lastName });
        redirectToLogin(undefined, 'idle');
        expect(readSavedReturn()?.account).toEqual({ username: 'u', displayName, initials });
      });

      it('upper-cases the surname letter in the name as in the initials', () => {
        stubLocation('https://app.example.com/tasks');
        signedIn({ username: 'u', firstName: 'ann', lastName: 'lee' });
        redirectToLogin(undefined, 'idle');
        expect(readSavedReturn()?.account).toMatchObject({ displayName: 'ann L.', initials: 'AL' });
      });

      it('shows the first name alone when there is no surname', () => {
        stubLocation('https://app.example.com/tasks');
        signedIn({ username: 'bob', firstName: 'Bob', lastName: ' ' });
        redirectToLogin(undefined, 'idle');
        expect(readSavedReturn()?.account).toEqual({
          username: 'bob',
          displayName: 'Bob',
          initials: 'B',
        });
      });

      it.each(['', '   '])(
        'never shows the username: no first name (%j) saves no one',
        firstName => {
          stubLocation('https://app.example.com/tasks');
          signedIn({ username: 'emp-10234', firstName, lastName: 'Lee' });
          redirectToLogin(undefined, 'idle');
          expect(readSavedReturn()?.account).toBeUndefined();
          expect(JSON.stringify(sessionStorage)).not.toContain('emp-10234');
        },
      );

      it('drops a malformed saved account when reading it back', () => {
        saveReturn({ path: '/tasks', account: { username: 'x' } as never });
        expect(readSavedReturn()?.account).toBeUndefined();
      });

      it('is not saved without a username to hint', () => {
        stubLocation('https://app.example.com/tasks');
        signedIn({ firstName: 'Ann', lastName: 'Lee' });
        redirectToLogin(undefined, 'idle');
        expect(readSavedReturn()?.account).toBeUndefined();
      });

      describe('at boot, with the card already saved for the page', () => {
        const card = {
          path: '/tasks',
          label: 'Tasks',
          reason: 'idle' as const,
          userId: 'u1',
          account: { username: 'ann', displayName: 'Ann L.', initials: 'AL' },
        };

        it('keeps who timed out and the label for the same page', () => {
          saveReturn(card);
          stubLocation('https://app.example.com/tasks');
          redirectToLogin(undefined, 'idle');
          expect(readSavedReturn()).toEqual(card);
        });

        it('keeps nothing for another page, or after "Not you?"', () => {
          saveReturn(card);
          stubLocation('https://app.example.com/other');
          redirectToLogin(undefined, 'idle');
          expect(readSavedReturn()).toEqual({ path: '/other', label: '', reason: 'idle' });

          saveReturn({ ...card, notYou: true });
          stubLocation('https://app.example.com/tasks');
          redirectToLogin(undefined, 'idle');
          expect(readSavedReturn()).toEqual({ path: '/tasks', label: '', reason: 'idle' });
        });

        it('does not lend the old user to a known one', () => {
          saveReturn(card);
          stubLocation('https://app.example.com/tasks');
          signedIn({ id: 'u2', username: 'bob', firstName: '', lastName: '' });
          redirectToLogin(undefined, 'idle');
          expect(readSavedReturn()).toMatchObject({ userId: 'u2' });
          expect(readSavedReturn()?.account).toBeUndefined();
        });
      });

      it('is not saved for a sign-out, a first visit, or a boot 401 (nobody in the store)', () => {
        stubLocation('https://app.example.com/tasks');
        signedIn({ username: 'ann', firstName: 'Ann', lastName: 'Lee' });
        redirectToLogin('/tasks', 'signed-out');
        expect(readSavedReturn()?.account).toBeUndefined();
        redirectToLogin('/tasks');
        expect(readSavedReturn()?.account).toBeUndefined();
        useAuthStore.setState({ user: null, isAuthenticated: false });
        redirectToLogin(undefined, 'idle');
        expect(readSavedReturn()?.account).toBeUndefined();
      });
    });

    it('names a record page by its menu, never by the record', () => {
      stubLocation('https://app.example.com/requests/123');
      redirectToLogin(undefined, 'idle');
      expect(readSavedReturn()?.label).toBe('Requests');
    });

    it('takes the longest matching menu path', () => {
      stubLocation('https://app.example.com/appraisals/list/5');
      redirectToLogin();
      expect(readSavedReturn()?.label).toBe('Appraisal list');
    });

    it('names an explicit return page the same way', () => {
      stubLocation('https://app.example.com/somewhere');
      redirectToLogin('/appraisals/9', 'ended');
      expect(readSavedReturn()).toMatchObject({ path: '/appraisals/9', label: 'Appraisals' });
    });

    it('has no name for a page that is not in the menu, or only shares a prefix', () => {
      stubLocation('https://app.example.com/requestsarchive/1');
      redirectToLogin();
      expect(readSavedReturn()?.label).toBe('');
    });

    it('has no name for the home page, even with a home menu item', () => {
      stubLocation('https://app.example.com/');
      redirectToLogin();
      expect(readSavedReturn()?.label).toBe('');
    });

    it('still redirects when the menu payload is malformed', () => {
      useMenuStore.setState({
        main: [{ ...menuItem('/requests', 'Requests'), children: null as never }],
      });
      const location = stubLocation('https://app.example.com/requests/1');
      redirectToLogin(undefined, 'ended');
      expect(location.href).toBe(login({ returnUrl: '/requests/1', reason: 'ended' }));
      expect(readSavedReturn()?.label).toBe('');
    });

    it('prefers the longest menu path even when a shorter one ends in a slash', () => {
      useMenuStore.setState({
        main: [menuItem('/appraisals/', 'Short'), menuItem('/appraisals/list', 'Long')],
      });
      stubLocation('https://app.example.com/appraisals/list/1');
      redirectToLogin();
      expect(readSavedReturn()?.label).toBe('Long');
    });

    it('matches a menu path that carries a query or a hash on its pathname only', () => {
      useMenuStore.setState({
        main: [menuItem('/tasks?view=mine', 'My tasks'), menuItem('/pool#all', 'Pool')],
      });
      stubLocation('https://app.example.com/tasks/7');
      redirectToLogin();
      expect(readSavedReturn()?.label).toBe('My tasks');
      stubLocation('https://app.example.com/pool');
      redirectToLogin();
      expect(readSavedReturn()?.label).toBe('Pool');
    });

    it('prefers the plain path among items sharing a pathname, then the first in menu order', () => {
      useMenuStore.setState({
        main: [
          menuItem('/tasks?activity=exec', 'Internal Appraisal Execution'),
          menuItem('/tasks?activity=check', 'Check'),
          menuItem(null, 'Group', [menuItem('/tasks', 'All Tasks')]),
          menuItem('/tasks', 'Duplicate plain'),
        ],
      });
      stubLocation('https://app.example.com/tasks');
      redirectToLogin();
      expect(readSavedReturn()?.label).toBe('All Tasks');
    });

    it('takes the first in menu order when only queried items share the pathname', () => {
      useMenuStore.setState({
        main: [menuItem('/pool?a=1', 'First'), menuItem('/pool?a=2', 'Second')],
      });
      stubLocation('https://app.example.com/pool');
      redirectToLogin();
      expect(readSavedReturn()?.label).toBe('First');
    });

    it('has no name when the menu is not loaded', () => {
      useMenuStore.getState().reset();
      stubLocation('https://app.example.com/requests/123');
      redirectToLogin();
      expect(readSavedReturn()?.label).toBe('');
    });
  });

  it('has nothing saved before the first redirect, and survives a corrupt value', () => {
    expect(readSavedReturn()).toBeUndefined();
    sessionStorage.setItem('cas-return', '{nope');
    expect(readSavedReturn()).toBeUndefined();
  });
});

describe('sameOriginPath', () => {
  const origin = 'https://app.example.com';

  it.each([
    '/.//evil.com',
    '/..//evil.com',
    '/a/..//evil.com',
    '//evil.com',
    '/\\evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    'http://[',
    'https://a b/',
    'http://x:99999',
    '//[x',
  ])('turns %s into /', path => {
    expect(sameOriginPath(path, origin)).toBe('/');
  });

  it('keeps an ordinary path, its query and hash', () => {
    expect(sameOriginPath('/a/../tasks/7?x=1#top', origin)).toBe('/tasks/7?x=1#top');
    expect(sameOriginPath(`${origin}/tasks?x=1`, origin)).toBe('/tasks?x=1');
  });
});

describe('saved sign-in state', () => {
  beforeEach(() => sessionStorage.clear());

  it('does not keep the one-shot signed-out reason', () => {
    saveReturn({ path: '/tasks', reason: 'signed-out' });
    expect(readSavedReturn()).toEqual({ path: '/tasks' });
  });

  it('keeps idle and ended', () => {
    saveReturn({ path: '/tasks', reason: 'idle' });
    expect(readSavedReturn()?.reason).toBe('idle');
  });

  it('never throws when storage is blocked', () => {
    const blocked = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => saveReturn({ path: '/tasks' })).not.toThrow();
    expect(() => clearSavedReturn()).not.toThrow();
    expect(readSavedReturn()).toBeUndefined();
    blocked.mockRestore();
    set.mockRestore();
    remove.mockRestore();
  });
});

describe('startSignIn without a usable VITE_APP_URL', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each(['', 'not a url'])('falls back to the current origin (%j)', appUrl => {
    vi.stubEnv('VITE_APP_URL', appUrl);
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    const location = stubLocation('https://app.example.com/login');
    expect(() => startSignIn('/tasks')).not.toThrow();
    expect(location.href).toBe(
      `https://api.example.com/auth/login?returnUrl=${encodeURIComponent('https://app.example.com/tasks')}`,
    );
  });
});

describe('the login route spelled with percent-encoding', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com');
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each(['/login', '/%6Cogin', '/%4Cogin/', '/LOG%49N', '/%6c%6f%67%69%6e/?x=1'])(
    'is the login route: %s',
    path => {
      expect(isLoginPath(new URL(path, 'https://a.example').pathname)).toBe(true);
      expect(isLoginPath(path.split('?')[0])).toBe(true);
    },
  );

  it.each(['/loginx', '/%256Cogin', '/%E0%A4%A', '/log%2Fin'])(
    'is not the login route: %s',
    path => {
      expect(isLoginPath(path)).toBe(false);
    },
  );

  it.each(['/%6Cogin', '/%4Cogin/', '/%6c%6f%67%69%6e'])(
    'is rejected as a return path: %s',
    path => {
      const location = stubLocation('https://app.example.com/tasks');
      redirectToLogin(path);
      expect(location.href).toBe(login({ returnUrl: '/' }));
    },
  );

  it('does nothing on the sign-in page spelled that way', () => {
    const location = stubLocation('https://app.example.com/%6Cogin');
    const before = location.href;
    redirectToLogin(undefined, 'ended');
    expect(location.href).toBe(before);
  });
});

describe('startSignIn', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com');
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends the browser to /auth/login with an absolute returnUrl', () => {
    const location = stubLocation('https://app.example.com/login');
    startSignIn('/tasks/7?x=1#top');
    expect(location.href).toBe(
      `https://api.example.com/auth/login?returnUrl=${encodeURIComponent('https://app.example.com/tasks/7')}`,
    );
  });

  it('adds the encoded username as login_hint', () => {
    const location = stubLocation('https://app.example.com/login');
    startSignIn('/tasks', { loginHint: 'a b&c@x' });
    expect(location.href).toBe(
      `https://api.example.com/auth/login?returnUrl=${encodeURIComponent('https://app.example.com/tasks')}&login_hint=a%20b%26c%40x`,
    );
  });

  it.each([
    undefined,
    '/login',
    '/Login/',
    'https://evil.example.org/steal',
    '//evil.example.org/steal',
    '/.//evil.example.org',
    '/..//evil.example.org',
    '/a/..//evil.example.org',
    '/\\evil.example.org',
  ])('returns home for %s', returnPath => {
    const location = stubLocation('https://app.example.com/login');
    startSignIn(returnPath);
    expect(location.href).toBe(
      `https://api.example.com/auth/login?returnUrl=${encodeURIComponent('https://app.example.com/')}`,
    );
  });
});

describe('hopToCanonicalOrigin', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('hopToCanonicalOrigin moves a non-canonical host and reports it', () => {
    const location = stubLocation('https://machine/tasks?x=1');
    expect(hopToCanonicalOrigin()).toBe(true);
    expect(location.replace).toHaveBeenCalledWith('https://app.example.com/tasks?x=1');
  });

  it('hopToCanonicalOrigin leaves the canonical origin alone', () => {
    const location = stubLocation('https://app.example.com/tasks');
    expect(hopToCanonicalOrigin()).toBe(false);
    expect(location.replace).not.toHaveBeenCalled();
  });
});

describe('isSavedUserOrUnknown / isSavedUserStrict', () => {
  it('compare known ids; an unknown saved user matches only the lenient one', () => {
    expect(isSavedUserOrUnknown('a', 'a')).toBe(true);
    expect(isSavedUserOrUnknown('a', 'b')).toBe(false);
    expect(isSavedUserOrUnknown('a', undefined)).toBe(false);
    expect(isSavedUserOrUnknown(undefined, 'b')).toBe(true);
    expect(isSavedUserStrict('a', 'a')).toBe(true);
    expect(isSavedUserStrict('a', 'b')).toBe(false);
    expect(isSavedUserStrict(undefined, 'b')).toBe(false);
  });
});
