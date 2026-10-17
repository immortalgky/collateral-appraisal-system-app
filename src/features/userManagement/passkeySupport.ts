/**
 * Can this browser run the registration flow? It needs parseCreationOptionsFromJSON and
 * navigator.credentials.create; the credential is serialised by hand where it has no toJSON (see
 * credentialToJson). Read at call time, not module load, so a test can install the globals.
 */
export const passkeysSupported = () =>
  typeof PublicKeyCredential !== 'undefined' &&
  typeof PublicKeyCredential.parseCreationOptionsFromJSON === 'function' &&
  !!navigator.credentials?.create;

// Newer than the DOM typings this project builds with.
type WithSignal = {
  signalUnknownCredential?: (options: { rpId: string; credentialId: string }) => Promise<void>;
};

/**
 * Tell the browser's passkey provider that the server does not know a credential it just created
 * (the registration failed after create()), so the orphan is removed from the user's keychain.
 * Best effort: where the Signal API is missing, or it fails, nothing is lost but the clean-up.
 */
export const signalUnknownCredential = (rpId: string, credentialId: string) => {
  try {
    const signal = (PublicKeyCredential as unknown as WithSignal).signalUnknownCredential;
    signal?.call(PublicKeyCredential, { rpId, credentialId })?.catch(() => {});
  } catch {
    // Best effort.
  }
};
