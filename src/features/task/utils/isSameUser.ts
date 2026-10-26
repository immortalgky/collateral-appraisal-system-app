/** Whether two usernames are the same person: the backend compares them ignoring case. */
export const isSameUser = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();
