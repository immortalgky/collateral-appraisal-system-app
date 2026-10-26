import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils';
import type { PasswordPolicyConfig } from '../../types';
import PasswordPolicyConfigPage from './PasswordPolicyConfigPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const config: PasswordPolicyConfig = {
  requiredLength: 8,
  requireDigit: true,
  requireLowercase: true,
  requireUppercase: true,
  requireNonAlphanumeric: false,
  requiredUniqueChars: 4,
  maxAccessWindowHours: 9,
  expiryDays: 90,
  historyCount: 5,
  blocklist: '',
  lockoutEnabled: true,
  maxFailedAccessAttempts: 6,
  lockoutMinutes: 15,
  requireTwoFactorForExternal: false,
  twoFactorRememberHours: 12,
};

describe('PasswordPolicyConfigPage two-factor section', () => {
  it('shows both fields from the policy', async () => {
    server.use(http.get('*/api/auth/admin/password-policy', () => HttpResponse.json(config)));
    render(<PasswordPolicyConfigPage />);

    expect(await screen.findByText('passwordPolicyConfig.twoFactorSection')).toBeInTheDocument();
    expect(
      screen.getByLabelText('passwordPolicyConfig.requireTwoFactorForExternal'),
    ).not.toBeChecked();
    // Label and hint are linked to the field.
    const hours = screen.getByLabelText('passwordPolicyConfig.twoFactorRememberHours');
    expect(hours).toHaveValue(12);
    expect(hours).toHaveAccessibleDescription('passwordPolicyConfig.twoFactorRememberHoursHint');
    expect(
      screen.getByLabelText('passwordPolicyConfig.requireTwoFactorForExternal'),
    ).toHaveAccessibleDescription('passwordPolicyConfig.requireTwoFactorForExternalHint');
    expect(screen.getByDisplayValue('12')).toHaveAttribute('max', '720');
    expect(screen.getByDisplayValue('12')).toHaveAttribute('min', '0');
  });

  it('saves both fields with the rest of the policy', async () => {
    const saved: unknown[] = [];
    server.use(
      http.get('*/api/auth/admin/password-policy', () => HttpResponse.json(config)),
      http.put('*/api/auth/admin/password-policy', async ({ request }) => {
        saved.push(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const queryClient = createTestQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { user } = render(<PasswordPolicyConfigPage />, { queryClient });

    await user.click(
      await screen.findByLabelText('passwordPolicyConfig.requireTwoFactorForExternal'),
    );
    const hours = screen.getByDisplayValue('12');
    await user.clear(hours);
    await user.type(hours, '24');
    await user.click(screen.getByRole('button', { name: 'passwordPolicyConfig.save' }));

    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toEqual({
      ...config,
      requireTwoFactorForExternal: true,
      twoFactorRememberHours: 24,
    });
    // The profile's twoFactorRequired comes from this policy.
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['currentUser'] });
  });
});
