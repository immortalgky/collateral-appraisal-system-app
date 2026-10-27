import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { server } from '@/test/mocks/server';

vi.mock('@features/auth/utils/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@features/auth/utils/auth')>()),
  redirectToLogin: vi.fn(),
}));

/** Resolves with the headers the request would have gone out with, without touching the network. */
const echoAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => ({
  data: config.headers.toJSON(),
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

// Fresh modules per test: the 401 redirect is single-flight (a module flag) and the user-activity
// clock starts at import, so neither may leak from one test into the next.
let axiosInstance: typeof import('./axiosInstance').default;
let redirectToLogin: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();
  axiosInstance = (await import('./axiosInstance')).default;
  redirectToLogin = vi.mocked((await import('@features/auth/utils/auth')).redirectToLogin);
});
afterEach(() => vi.useRealTimers());

const send = (config: AxiosRequestConfig) =>
  axiosInstance.request({ url: '/ping', adapter: echoAdapter, ...config });

/** Moves the clock past the user-driven window without any user input. */
const goIdle = () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(Date.now() + 60_000);
};

describe('axiosInstance', () => {
  it('sends credentials and never an Authorization header', async () => {
    expect(axiosInstance.defaults.withCredentials).toBe(true);
    const { data } = await send({});
    expect(data.Authorization).toBeUndefined();
  });

  it('does not mark a request made right after the page loaded', async () => {
    const { data } = await send({});
    expect(data['X-Background-Request']).toBeUndefined();
  });

  it('marks a request as background when the user has been idle', async () => {
    goIdle();
    const { data } = await send({});
    expect(data['X-Background-Request']).toBe('1');
  });

  it('does not mark a request that follows user input', async () => {
    goIdle();
    window.dispatchEvent(new Event('pointerdown'));
    const { data } = await send({});
    expect(data['X-Background-Request']).toBeUndefined();
  });

  it('sends the browser to sign in again on 401', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.json({}, { status: 401 })));
    await expect(axiosInstance.get('/ping')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
    expect(redirectToLogin).toHaveBeenCalledWith(undefined, undefined);
  });

  describe("the reason a 401 gives, from the API's X-Session-End header", () => {
    const unauthorized = (headers?: Record<string, string>) =>
      server.use(http.get('*/api/ping', () => HttpResponse.json({}, { status: 401, headers })));

    it.each([
      ['idle', 'idle'],
      ['ended', 'ended'],
      ['something-new', 'ended'],
    ])('X-Session-End: %s gives %s', async (header, reason) => {
      unauthorized({ 'X-Session-End': header });
      await axiosInstance.get('/ping').catch(() => {});
      expect(redirectToLogin).toHaveBeenCalledWith(undefined, reason);
    });

    it('claims nothing without the header (there was no session cookie to end)', async () => {
      unauthorized();
      await axiosInstance.get('/ping').catch(() => {});
      expect(redirectToLogin).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  it('sends the browser to sign in once when several requests fail together', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.json({}, { status: 401 })));
    await Promise.allSettled([axiosInstance.get('/ping'), axiosInstance.get('/ping')]);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it('lets a later 401 redirect again once the page turned out not to be leaving', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    server.use(http.get('*/api/ping', () => HttpResponse.json({}, { status: 401 })));
    await axiosInstance.get('/ping').catch(() => {}); // e.g. a cancelled "Leave site?" prompt
    await axiosInstance.get('/ping').catch(() => {});
    expect(redirectToLogin).toHaveBeenCalledTimes(1);

    const { REDIRECT_SETTLE_MS } = await import('./forcedNavigation');
    vi.advanceTimersByTime(REDIRECT_SETTLE_MS);
    await axiosInstance.get('/ping').catch(() => {});
    expect(redirectToLogin).toHaveBeenCalledTimes(2);
  });

  it('does not lock later 401s when the redirect itself throws', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    redirectToLogin.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    server.use(http.get('*/api/ping', () => HttpResponse.json({}, { status: 401 })));
    // The caller still sees the 401, not the redirect's own failure.
    await expect(axiosInstance.get('/ping')).rejects.toMatchObject({ response: { status: 401 } });
    expect(redirectToLogin).toHaveBeenCalledTimes(1);

    const { REDIRECT_SETTLE_MS } = await import('./forcedNavigation');
    vi.advanceTimersByTime(REDIRECT_SETTLE_MS);
    await axiosInstance.get('/ping').catch(() => {});
    expect(redirectToLogin).toHaveBeenCalledTimes(2);
  });

  it('does not redirect while a sign-out is in progress, and does again after', async () => {
    const { suspendLoginRedirect } = await import('./axiosInstance');
    server.use(http.get('*/api/ping', () => HttpResponse.json({}, { status: 401 })));
    suspendLoginRedirect(true);
    await axiosInstance.get('/ping').catch(() => {});
    expect(redirectToLogin).not.toHaveBeenCalled();

    suspendLoginRedirect(false);
    await axiosInstance.get('/ping').catch(() => {});
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it('attaches the parsed ProblemDetails to a 401 before rejecting', async () => {
    server.use(
      http.get('*/api/ping', () =>
        HttpResponse.json({ title: 'Unauthorized', detail: 'Session ended' }, { status: 401 }),
      ),
    );
    await expect(axiosInstance.get('/ping')).rejects.toMatchObject({
      apiError: { title: 'Unauthorized', detail: 'Session ended' },
    });
  });

  it('lets a caller opt out of the 401 redirect', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.json({}, { status: 401 })));
    await expect(axiosInstance.get('/ping', { skipAuthRedirect: true })).rejects.toBeDefined();
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it('does not redirect on 403', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.json({}, { status: 403 })));
    await expect(axiosInstance.get('/ping')).rejects.toBeDefined();
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it('re-reads the current user on the must-change-password 403, once for a burst', async () => {
    let meCalls = 0;
    server.use(
      http.get('*/api/ping', () =>
        HttpResponse.json({ title: 'Password change required' }, { status: 403 }),
      ),
      http.get('*/api/auth/me', () => {
        meCalls++;
        return HttpResponse.json({
          id: 'u1',
          username: 'ann',
          roles: [],
          mustChangePassword: true,
        });
      }),
    );
    const { useAuthStore } = await import('@features/auth/store');
    await Promise.allSettled([axiosInstance.get('/ping'), axiosInstance.get('/ping')]);
    await vi.waitFor(() => expect(useAuthStore.getState().user?.mustChangePassword).toBe(true));
    expect(meCalls).toBe(1);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it('re-reads the current user when the must-change 403 arrives as a blob body', async () => {
    let meCalls = 0;
    server.use(
      http.get('*/api/ping', () =>
        HttpResponse.json({ title: 'Password change required' }, { status: 403 }),
      ),
      http.get('*/api/auth/me', () => {
        meCalls++;
        return HttpResponse.json({
          id: 'u1',
          username: 'ann',
          roles: [],
          mustChangePassword: true,
        });
      }),
    );
    await axiosInstance.get('/ping', { responseType: 'blob' }).catch(() => {});
    await vi.waitFor(() => expect(meCalls).toBe(1));
  });

  it('leaves other 403s alone', async () => {
    let meCalls = 0;
    server.use(
      http.get('*/api/ping', () => HttpResponse.json({ title: 'Forbidden' }, { status: 403 })),
      http.get('*/api/auth/me', () => {
        meCalls++;
        return HttpResponse.json({});
      }),
    );
    await axiosInstance.get('/ping').catch(() => {});
    await new Promise(r => setTimeout(r, 20));
    expect(meCalls).toBe(0);
  });
});
