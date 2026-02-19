/**
 * check If value is empty will return true or If field is not dirty return true
 * @param args
 * @returns
 */
export function shouldAutoDefault(args: { value: unknown; isDirty: boolean }) {
  const { value, isDirty } = args;
  const empty = value == null || value === '';
  return empty || !isDirty;
}
