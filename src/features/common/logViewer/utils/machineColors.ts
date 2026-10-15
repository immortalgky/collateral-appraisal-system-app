// Validated for colour-blind separation (plan section F). The app is light-theme only (see
// plan section D0 — no dark-mode toggle exists), so only the light pair is used; a 3rd+ machine
// gets further distinct hues rather than cycling back to the first two.
const MACHINE_COLORS = ['#0D9488', '#7C3AED', '#DB2777', '#2563EB', '#CA8A04', '#059669'];

/** Machines are always shown in this fixed, sorted order so a colour always means the same
 * machine across every chart and every reload. */
export function sortMachineNames(machineNames: string[]): string[] {
  return [...machineNames].sort((a, b) => a.localeCompare(b));
}

export function colorForMachineIndex(index: number): string {
  return MACHINE_COLORS[index % MACHINE_COLORS.length];
}

/**
 * The canonical machine-name registry for a view: the sorted union of every source's machine
 * names (e.g. /current + /system-metrics), so a colour index means the same machine everywhere
 * even when one source's window happens to be missing a machine the other one has.
 *
 * Accepted limitation: the strip (Logs view) and the health tab each call this with their OWN
 * `/current` fetch — same query key, same cache, but two independent unions. They can disagree
 * only for a machine that has stopped reporting to `/current` entirely (rare — that machine is
 * down or decommissioned), where whichever view's `/system-metrics` window still has history for
 * it will include a name the other view's union doesn't. Fixing this fully would need one global
 * machine-name list shared across the whole feature rather than a per-view union; not worth it
 * for how rarely a machine actually stops reporting.
 */
export function unionMachineNames(...lists: string[][]): string[] {
  return sortMachineNames([...new Set(lists.flat())]);
}

/** Looks a machine up in the canonical registry above instead of relying on the caller's own
 * (possibly differently-ordered or differently-sized) iteration index. */
export function colorForMachineName(name: string, allNames: string[]): string {
  const index = allNames.indexOf(name);
  return colorForMachineIndex(index === -1 ? allNames.length : index);
}
