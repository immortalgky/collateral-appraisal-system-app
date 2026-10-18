import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hopToCanonicalOrigin, redirectToLogin } from './auth';

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

describe('redirectToLogin', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_APP_URL', 'https://app.example.com');
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('navigates to /auth/login with the current SPA URL as returnUrl', () => {
    const location = stubLocation('https://app.example.com/appraisals/1?tab=2#top');
    redirectToLogin();
    expect(location.href).toBe(
      `https://api.example.com/auth/login?returnUrl=${encodeURIComponent('https://app.example.com/appraisals/1?tab=2#top')}`,
    );
  });

  it('returns to the home page rather than to /login', () => {
    const location = stubLocation('https://app.example.com/login');
    redirectToLogin();
    expect(location.href).toBe(
      `https://api.example.com/auth/login?returnUrl=${encodeURIComponent('https://app.example.com/')}`,
    );
  });

  it('hops to the canonical origin first, keeping the path, when opened under another host name', () => {
    const location = stubLocation('https://machine/appraisals?tab=2');
    const before = location.href;
    redirectToLogin();
    expect(location.replace).toHaveBeenCalledWith('https://app.example.com/appraisals?tab=2');
    expect(location.href).toBe(before);
  });

  it('comes back to an explicit returnPath instead of the current page', () => {
    const location = stubLocation('https://app.example.com/login');
    redirectToLogin('/tasks/7?x=1');
    expect(location.href).toBe(
      `https://api.example.com/auth/login?returnUrl=${encodeURIComponent('https://app.example.com/tasks/7?x=1')}`,
    );
  });

  it.each(['https://evil.example.org/steal', '//evil.example.org/steal'])(
    'never returns to another origin (%s)',
    returnPath => {
      const location = stubLocation('https://app.example.com/login');
      redirectToLogin(returnPath);
      expect(location.href).toBe(
        `https://api.example.com/auth/login?returnUrl=${encodeURIComponent('https://app.example.com/')}`,
      );
    },
  );

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
