import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import type { OAuthClientDetail, OAuthScope } from '../types';
import OAuthClientDrawer from './OAuthClientDrawer';

const createMutate = vi.fn();
const updateMutate = vi.fn();
let detail: OAuthClientDetail | undefined;
let registered: OAuthScope[] = [];

vi.mock('../api/oauthClients', () => ({
  useGetClient: () => ({ data: detail }),
  useCreateClient: () => ({ mutate: createMutate, isPending: false }),
  useUpdateClient: () => ({ mutate: updateMutate, isPending: false }),
}));
vi.mock('../api/oauthScopes', () => ({
  FETCH_ALL_SCOPES: {},
  useGetScopes: () => ({ data: { items: registered }, isSuccess: true }),
}));

const client = (over: Partial<OAuthClientDetail> = {}): OAuthClientDetail => ({
  id: 'id-1',
  clientId: 'los',
  displayName: 'LOS',
  clientType: 'confidential',
  grantTypes: ['client_credentials'],
  scopes: [],
  hasSecret: true,
  isSystem: false,
  redirectUris: [],
  postLogoutRedirectUris: [],
  ...over,
});

const renderDrawer = (editId: string | null) =>
  render(
    <OAuthClientDrawer
      isOpen
      onClose={vi.fn()}
      editId={editId}
      onCreated={vi.fn()}
      onRequestDelete={vi.fn()}
      onRequestRotate={vi.fn()}
    />,
  );

const lifetimeInput = () => screen.getByLabelText('Upload session lifetime', { selector: 'input' });
const unitSelect = () => screen.getByRole('combobox', { name: 'Upload session lifetime Unit' });
const chip = (name: string) => screen.getByRole('button', { name });
const save = () => screen.getByRole('button', { name: 'Save' });

describe('OAuthClientDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detail = undefined;
    registered = [];
  });

  describe('upload session lifetime', () => {
    it('converts days to whole hours on create', async () => {
      const { user } = renderDrawer(null);
      await user.type(screen.getByLabelText(/Display name/), 'Partner');
      await user.click(chip('Authorization code')); // off
      await user.click(chip('Client credentials')); // on
      await user.click(screen.getByText('Token lifetime')); // open the disclosure
      await user.type(lifetimeInput(), '2');
      await user.selectOptions(unitSelect(), 'days');
      await user.click(screen.getByRole('button', { name: 'Register' }));

      expect(createMutate.mock.calls[0][0]).toMatchObject({ uploadSessionLifetimeHours: 48 });
    });

    it('hides the field without client_credentials and sends the stored value unchanged', async () => {
      detail = client({
        grantTypes: ['authorization_code'],
        redirectUris: ['https://a/cb'],
        uploadSessionLifetimeHours: 72,
      });
      const { user } = renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');

      expect(screen.queryByText('Upload session lifetime')).toBeNull();
      await user.click(save());

      expect(updateMutate.mock.calls[0][0].request).toMatchObject({
        uploadSessionLifetimeHours: 72,
      });
    });

    it.each([
      ['hours', '721'],
      ['days', '31'],
    ])('blocks save at %s when the value is %s', async (unit, value) => {
      detail = client();
      const { user } = renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');
      await user.selectOptions(unitSelect(), unit);
      await user.type(lifetimeInput(), value);

      expect(save()).toBeDisabled();
      expect(
        screen.getByText(unit === 'days' ? 'Whole number, 1–30 days' : 'Whole number, 1–720 hours'),
      ).toBeInTheDocument();
    });

    it.each([
      [48, '2', 'days'],
      [50, '50', 'hours'],
    ])('loads a stored %s hours as %s %s', async (stored, value, unit) => {
      detail = client({ uploadSessionLifetimeHours: stored });
      renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');

      expect(lifetimeInput()).toHaveValue(value);
      expect(unitSelect()).toHaveValue(unit);
    });

    it('sends null when the visible field is cleared', async () => {
      detail = client({ uploadSessionLifetimeHours: 48 });
      const { user } = renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');
      await user.clear(lifetimeInput());
      await user.click(save());

      expect(updateMutate.mock.calls[0][0].request).toMatchObject({
        uploadSessionLifetimeHours: null,
      });
    });

    it.each(['1e', '1.5', '+5'])('rejects %s even though Number() may accept it', async value => {
      detail = client({ uploadSessionLifetimeHours: 48 });
      const { user } = renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');
      await user.clear(lifetimeInput());
      await user.type(lifetimeInput(), value);

      expect(save()).toBeDisabled();
      expect(screen.getByText('Whole number, 1–30 days')).toBeInTheDocument();
    });

    it('sends the stored value, not the edited one, after the field is hidden', async () => {
      detail = client({
        grantTypes: ['client_credentials', 'refresh_token'],
        uploadSessionLifetimeHours: 48,
      });
      const { user } = renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');
      await user.clear(lifetimeInput());
      await user.type(lifetimeInput(), '1e');
      expect(save()).toBeDisabled();
      await user.click(chip('Client credentials'));

      expect(save()).toBeEnabled();
      await user.click(save());
      expect(updateMutate.mock.calls[0][0].request).toMatchObject({
        uploadSessionLifetimeHours: 48,
      });
    });
  });

  describe('token lifetimes', () => {
    it('sends null for empty fields and rejects out-of-range or malformed values', async () => {
      detail = client({ grantTypes: ['refresh_token'], accessTokenLifetimeMinutes: 30 });
      const { user } = renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');
      const access = screen.getByLabelText('Access token');

      await user.clear(access);
      await user.type(access, '0');
      expect(save()).toBeDisabled();
      await user.clear(access);
      await user.type(access, '1e3');
      expect(save()).toBeDisabled();
      await user.clear(access);
      expect(save()).toBeEnabled();
      await user.click(save());

      expect(updateMutate.mock.calls[0][0].request).toMatchObject({
        accessTokenLifetimeMinutes: null,
        identityTokenLifetimeMinutes: null,
        refreshTokenLifetimeMinutes: null,
      });
    });

    it('does not let a disabled refresh field block save', async () => {
      detail = client({ grantTypes: ['client_credentials', 'refresh_token'] });
      const { user } = renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');
      await user.type(screen.getByLabelText(/Refresh token \(/), '99999999');
      expect(save()).toBeDisabled();
      await user.click(chip('Refresh token'));

      expect(save()).toBeEnabled();
    });
  });

  describe('scope chips', () => {
    it('keeps a scope the client holds that is not registered, and sends it back', async () => {
      registered = [
        { id: 's1', name: 'appraisal.read', displayName: null, description: null, resources: [] },
      ];
      detail = client({ scopes: ['legacy.scope', 'openid'] });
      const { user } = renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');

      expect(chip('legacy.scope')).toHaveAttribute('aria-pressed', 'true');
      expect(chip('openid')).toHaveAttribute('aria-pressed', 'true');
      expect(chip('appraisal.read')).toHaveAttribute('aria-pressed', 'false');

      await user.click(chip('appraisal.read'));
      await user.click(save());
      expect(updateMutate.mock.calls[0][0].request.scopes).toEqual([
        'legacy.scope',
        'openid',
        'appraisal.read',
      ]);
    });
  });

  describe('redirect URIs', () => {
    it('requires one when authorization_code is selected and trims the list', async () => {
      const { user } = renderDrawer(null);
      await user.type(screen.getByLabelText(/Display name/), 'Portal');
      expect(screen.getByRole('button', { name: 'Register' })).toBeDisabled();

      await user.type(screen.getByLabelText('Redirect URI 1'), ' https://p/cb ');
      await user.click(screen.getByRole('button', { name: 'Register' }));

      expect(createMutate.mock.calls[0][0]).toMatchObject({
        redirectUris: ['https://p/cb'],
        clientType: 'confidential',
      });
    });

    it('echoes stored URIs when the section is hidden', async () => {
      detail = client({
        grantTypes: ['authorization_code'],
        redirectUris: ['https://a/cb'],
      });
      const { user } = renderDrawer('id-1');
      await screen.findByDisplayValue('LOS');
      await user.click(chip('Authorization code'));
      await user.click(chip('Client credentials'));
      await user.click(save());

      expect(updateMutate.mock.calls[0][0].request.redirectUris).toEqual(['https://a/cb']);
    });
  });
});
