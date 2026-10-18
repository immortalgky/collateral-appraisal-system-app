import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import type { OAuthClientDetail } from '../types';
import OAuthClientFormModal from './OAuthClientFormModal';

const createMutate = vi.fn();
const updateMutate = vi.fn();
let detail: OAuthClientDetail | undefined;

vi.mock('../api/oauthClients', () => ({
  useGetClient: () => ({ data: detail }),
  useCreateClient: () => ({ mutate: createMutate, isPending: false }),
  useUpdateClient: () => ({ mutate: updateMutate, isPending: false }),
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

const renderModal = (editId: string | null) =>
  render(<OAuthClientFormModal isOpen onClose={vi.fn()} editId={editId} onCreated={vi.fn()} />);

const lifetimeInput = () => screen.getByLabelText('Upload session lifetime', { selector: 'input' });
const unitSelect = () => screen.getByRole('combobox', { name: 'Upload session lifetime Unit' });

describe('OAuthClientFormModal upload session lifetime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detail = undefined;
  });

  it('converts days to whole hours on create', async () => {
    const { user } = renderModal(null);
    await user.type(screen.getByLabelText('Display Name'), 'Partner');
    await user.click(screen.getByLabelText('Authorization Code'));
    await user.click(screen.getByLabelText('Client Credentials'));
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
    const { user } = renderModal('id-1');
    await screen.findByDisplayValue('LOS');

    expect(screen.queryByText('Upload session lifetime')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateMutate.mock.calls[0][0].request).toMatchObject({ uploadSessionLifetimeHours: 72 });
  });

  it.each([
    ['hours', '721'],
    ['days', '31'],
  ])('blocks save at %s when the value is %s', async (unit, value) => {
    detail = client();
    const { user } = renderModal('id-1');
    await screen.findByDisplayValue('LOS');
    await user.selectOptions(unitSelect(), unit);
    await user.type(lifetimeInput(), value);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(
      screen.getByText(unit === 'days' ? 'Whole number, 1–30 days' : 'Whole number, 1–720 hours'),
    ).toBeInTheDocument();
  });

  it.each([
    [48, '2', 'days'],
    [50, '50', 'hours'],
  ])('loads a stored %s hours as %s %s', async (stored, value, unit) => {
    detail = client({ uploadSessionLifetimeHours: stored });
    renderModal('id-1');
    await screen.findByDisplayValue('LOS');

    expect(lifetimeInput()).toHaveValue(value);
    expect(unitSelect()).toHaveValue(unit);
  });

  it('sends hours converted from the edited days', async () => {
    detail = client({ uploadSessionLifetimeHours: 48 });
    const { user } = renderModal('id-1');
    await screen.findByDisplayValue('LOS');
    await user.clear(lifetimeInput());
    await user.type(lifetimeInput(), '3');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateMutate.mock.calls[0][0].request).toMatchObject({ uploadSessionLifetimeHours: 72 });
  });

  it('sends null when the visible field is cleared', async () => {
    detail = client({ uploadSessionLifetimeHours: 48 });
    const { user } = renderModal('id-1');
    await screen.findByDisplayValue('LOS');
    await user.clear(lifetimeInput());
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateMutate.mock.calls[0][0].request).toMatchObject({
      uploadSessionLifetimeHours: null,
    });
  });

  it('rejects malformed text instead of reading it as empty', async () => {
    detail = client({ uploadSessionLifetimeHours: 48 });
    const { user } = renderModal('id-1');
    await screen.findByDisplayValue('LOS');
    await user.clear(lifetimeInput());
    await user.type(lifetimeInput(), '1e');

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText('Whole number, 1–30 days')).toBeInTheDocument();
  });

  it('loads a stored 0 as an empty input with Hours selected', async () => {
    detail = client({ uploadSessionLifetimeHours: 0 });
    renderModal('id-1');
    await screen.findByDisplayValue('LOS');

    expect(lifetimeInput()).toHaveValue('');
    expect(unitSelect()).toHaveValue('hours');
  });

  it.each(['1.5', '+5'])('rejects %s even though Number() would accept it', async value => {
    detail = client({ uploadSessionLifetimeHours: 48 });
    const { user } = renderModal('id-1');
    await screen.findByDisplayValue('LOS');
    await user.clear(lifetimeInput());
    await user.type(lifetimeInput(), value);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText('Whole number, 1–30 days')).toBeInTheDocument();
  });

  it('stops an invalid hidden value from blocking save once the field is hidden', async () => {
    detail = client({ grantTypes: ['client_credentials', 'refresh_token'] });
    const { user } = renderModal('id-1');
    await screen.findByDisplayValue('LOS');
    await user.type(lifetimeInput(), '1e');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    await user.click(screen.getByLabelText('Client Credentials'));

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('sends the stored value, not the edited one, after the field is hidden', async () => {
    detail = client({
      grantTypes: ['client_credentials', 'refresh_token'],
      uploadSessionLifetimeHours: 48,
    });
    const { user } = renderModal('id-1');
    await screen.findByDisplayValue('LOS');
    await user.clear(lifetimeInput());
    await user.type(lifetimeInput(), '3');
    await user.click(screen.getByLabelText('Client Credentials'));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateMutate.mock.calls[0][0].request).toMatchObject({ uploadSessionLifetimeHours: 48 });
  });
});
