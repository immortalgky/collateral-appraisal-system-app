/**
 * How an assignee is written on screen.
 *
 * The workflow engine stores two different kinds of thing in one column. `AssignedType` tells them
 * apart: '1' is a person (a bank code such as "P5229" or "int.staff1"), anything else is a POOL —
 * a group name, optionally scoped to a team by PoolAssigneeSelector, which appends
 * ":Team_<teamId>". Credit reads the group as the desk that holds the work ("IntAdmin"); the team
 * GUID is an internal routing detail and is noise on a 260px rail.
 */

const USER_ASSIGNED_TYPE = '1';
const TEAM_MARKER = ':Team_';

/**
 * True when this assignee is a group/pool rather than a named person.
 *
 * `assignedType` is the single authority, deliberately. Two cleverer rules were tried and both
 * were worse: "no matching user" made a pool whose group name equals a username ("Admin" vs
 * "admin", case-insensitive) resolve to that person, and a ':Team_' test still missed a bare group
 * name. Where the engine labels a pool as '1' that is a WRITER bug and is fixed at the writer.
 */
export const isPoolAssignee = (assignedType: string | null | undefined) =>
  !!assignedType && assignedType !== USER_ASSIGNED_TYPE;

/**
 * "ExtAdmin:Team_019d1b89-…" → "ExtAdmin". Multi-group emission ("G1,G2:Team_x") keeps both
 * names, since the suffix is appended once at the end of the whole list.
 */
export const poolLabel = (assignedTo: string | null | undefined) =>
  assignedTo ? (assignedTo.split(TEAM_MARKER)[0] ?? assignedTo) : null;

/**
 * The login a person is named by, when it adds something.
 *
 * Suppressed when the display name IS the code — GetTaskHistory falls back to the raw assignee
 * whenever the user lookup misses, so showing both would print "P5229 (P5229)".
 */
export const loginCode = (
  assignedTo: string | null | undefined,
  displayName: string | null | undefined,
) => (assignedTo && assignedTo !== displayName ? assignedTo : null);
