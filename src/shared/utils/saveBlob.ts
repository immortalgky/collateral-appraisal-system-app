/**
 * Hand a blob to the browser as a file download.
 *
 * Two details this exists to get right, both of which the hand-rolled copies got wrong:
 *
 * 1. The anchor is APPENDED to the document before it is clicked. Firefox ignores a click on an
 *    element that is not in the tree, so the download silently did nothing there.
 * 2. The object URL is revoked on a later tick, not on the next statement. Revoking synchronously
 *    after `click()` can pull the blob out from under a browser that has not started reading it
 *    yet — again, no file, no error.
 */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // A tick is enough for every engine to have taken the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
