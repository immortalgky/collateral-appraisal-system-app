import type { BadgeTone } from '@/shared/components/Badge';

/** Staff workload colour: up to 2 tasks green, up to 4 amber, more red. */
export const workloadTone = (tasks: number): BadgeTone =>
  tasks <= 2 ? 'green' : tasks <= 4 ? 'yellow' : 'red';
