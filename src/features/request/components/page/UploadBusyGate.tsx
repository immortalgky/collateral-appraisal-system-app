import type { ReactNode } from 'react';
import { useRequestUploadBusy } from '../../hooks/useRequestUploadBusy';

/**
 * Tells its children whether a file of this request is still uploading. It watches documents and
 * titles itself, so only what it wraps re-renders on their changes, not the page.
 */
const UploadBusyGate = ({ children }: { children: (busy: boolean) => ReactNode }) => (
  <>{children(useRequestUploadBusy())}</>
);

export default UploadBusyGate;
