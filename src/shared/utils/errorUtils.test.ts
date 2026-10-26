import { describe, expect, it } from 'vitest';
import { errorText } from './errorUtils';

const axiosError = (response?: { status: number; data?: unknown }, extra: object = {}) => ({
  isAxiosError: true,
  message: 'Network Error',
  response,
  ...extra,
});

describe('errorText', () => {
  it("prefers the interceptor's apiError detail, which blob downloads recover too", () => {
    const err = axiosError({ status: 403 }, { apiError: { detail: 'Not your appraisal' } });
    expect(errorText(err, 'fallback')).toBe('Not your appraisal');
  });

  it('reads a ProblemDetails body when apiError is missing', () => {
    expect(errorText(axiosError({ status: 400, data: { detail: 'Blocking errors' } }), 'fb')).toBe(
      'Blocking errors',
    );
  });

  it('uses the fallback for network errors, cancellations and bare status codes', () => {
    expect(errorText(axiosError(undefined), 'fb')).toBe('fb');
    expect(
      errorText(axiosError(undefined, { message: 'canceled', code: 'ERR_CANCELED' }), 'fb'),
    ).toBe('fb');
    expect(errorText(axiosError({ status: 500, data: '' }), 'fb')).toBe('fb');
    expect(errorText(new Error('boom'), 'fb')).toBe('fb');
  });

  it('shows the message of a stalled or cancelled transfer, which carries apiError', () => {
    const err = Object.assign(new Error('x'), { apiError: { detail: 'The upload stalled' } });
    expect(errorText(err, 'fb')).toBe('The upload stalled');
  });
});
