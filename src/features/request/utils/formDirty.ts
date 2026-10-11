/**
 * Whether a field the maker changed still differs from what the form loaded with.
 *
 * Read from `formState.dirtyFields`, not `formState.isDirty`. `isDirty` compares the WHOLE form with its
 * loaded values, and a form this page fills in after loading (the required document slots of each
 * title, a place name the address picker resolves) never equals them again: the first write that
 * asks for a dirty check turns it on for good, even when that write only put a field back as it was
 * (a cancelled title editor, a failed replace). `dirtyFields` is kept per field, and a field that is
 * back to its loaded value drops out of it.
 */
export const hasDirtyFields = (dirtyFields: unknown): boolean => {
  if (dirtyFields === true) return true;
  if (!dirtyFields || typeof dirtyFields !== 'object') return false;
  return Object.values(dirtyFields).some(hasDirtyFields);
};
