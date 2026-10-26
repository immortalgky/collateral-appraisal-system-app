import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { useAuthStore } from '@features/auth/store';
import type { Passkey, PasskeyRegisterOptions, PasskeyRegisterRequest } from '../types';

export const passkeyKeys = {
  mine: ['passkeys', 'me'] as const,
};

const BASE = '/auth/me/passkeys';

/** Own passkeys, newest last as the API returns them. */
export const useGetMyPasskeys = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return useQuery({
    queryKey: passkeyKeys.mine,
    queryFn: async (): Promise<Passkey[]> => {
      const { data } = await axios.get<Passkey[]>(BASE);
      return data;
    },
    enabled: isAuthenticated,
  });
};

/**
 * Registration step 1: the options for navigator.credentials.create() and the sealed state to send
 * back. Fails with PasskeyReauthRequired when the last sign-in is older than 10 minutes. The state is
 * single-purpose and expires, so nothing is kept once the dialog is gone (gcTime 0).
 */
export const useGetPasskeyRegisterOptions = () =>
  useMutation({
    gcTime: 0,
    // `issuedAt` is ours (client clock): the API's sealed state expires, and the caller refuses to
    // use options older than PASSKEY_OPTIONS_MAX_AGE_MS.
    mutationFn: async (): Promise<PasskeyRegisterOptions & { issuedAt: number }> => {
      const { data } = await axios.post<PasskeyRegisterOptions>(`${BASE}/register/options`);
      return { ...data, issuedAt: Date.now() };
    },
  });

const toBase64Url = (buffer: ArrayBuffer) =>
  btoa(Array.from(new Uint8Array(buffer), byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

// An optional member of a wrapped credential can throw (a failed brand check, say): that must not
// sink the rest, so each falls back to its own default.
const optional = <T>(read: () => T | undefined, fallback: T): T => {
  try {
    return read() ?? fallback;
  } catch {
    return fallback;
  }
};

/**
 * The credential as RegistrationResponseJSON. Its own toJSON() when there is a working one; a
 * credential handed back by a password-manager extension (Bitwarden, 1Password) may have none, or
 * one that throws, so then it is written out by hand.
 */
export const credentialToJson = (credential: PublicKeyCredential): PublicKeyCredentialJSON => {
  try {
    if (typeof credential.toJSON === 'function') return credential.toJSON();
  } catch {
    // Fall through to the hand-written form.
  }
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: optional(() => credential.authenticatorAttachment, null) ?? undefined,
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      attestationObject: toBase64Url(response.attestationObject),
      transports: optional(() => response.getTransports?.(), []),
    },
    clientExtensionResults: optional(() => credential.getClientExtensionResults?.(), {}),
  };
};

/** Longest name the API accepts (trimmed, 1 to this many characters). */
export const PASSKEY_NAME_MAX = 100;

/** Does the server accept this (already trimmed) name? 1 to PASSKEY_NAME_MAX, no control characters. */
export const validPasskeyName = (name: string) =>
  name.length >= 1 &&
  name.length <= PASSKEY_NAME_MAX &&
  // eslint-disable-next-line no-control-regex -- control characters are exactly what is refused
  !/[\u0000-\u001F\u007F-\u009F]/.test(name);

// The server's sealed state lives 5 minutes and the browser prompt can take up to 60 s; 3 minutes
// leaves a margin for latency and for the server sealing before the client stamps `issuedAt`.
export const PASSKEY_OPTIONS_MAX_AGE_MS = 3 * 60_000;

// Fire and forget: returning the promise would make mutateAsync wait for the list to reload.
const useInvalidateMine = () => {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: passkeyKeys.mine });
  };
};

/** Registration step 2: hand the authenticator's answer to the API. */
export const useRegisterPasskey = () => {
  const invalidate = useInvalidateMine();
  return useMutation({
    mutationFn: async (request: PasskeyRegisterRequest): Promise<Passkey> => {
      const { data } = await axios.post<Passkey>(`${BASE}/register`, request);
      return data;
    },
    // A timeout, a 5xx, AlreadyRegistered or the limit can all leave the list changed or unknown.
    onSettled: invalidate,
  });
};

export const useRenamePasskey = () => {
  const invalidate = useInvalidateMine();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await axios.put(`${BASE}/${id}`, { name });
    },
    // A passkey that was already gone (404) is a changed list too, so refresh on any outcome.
    onSettled: invalidate,
  });
};

export const useDeletePasskey = () => {
  const invalidate = useInvalidateMine();
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${BASE}/${id}`);
    },
    // A passkey that was already gone (404) leaves the same list, so refresh on any outcome.
    onSettled: invalidate,
  });
};
