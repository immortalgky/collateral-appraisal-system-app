/**
 * `navigator.clipboard` is undefined outside a secure context (plain http) — guarded here once
 * instead of at every call site, with success/failure reported via callbacks so each caller can
 * show its own toast wording.
 */
export function copyToClipboard(text: string, onOk: () => void, onFail: () => void): void {
  if (!navigator.clipboard) {
    onFail();
    return;
  }
  navigator.clipboard.writeText(text).then(onOk, onFail);
}
