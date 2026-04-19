// FontAwesome sprite icon names. Rendered via @shared/components/Icon, which
// resolves to /icons/{style}.svg#{name}.

// Literal class strings — Tailwind JIT needs them verbatim.
export const ACCENT_CLASSES: Record<
  string,
  {
    bg: string;
    gradient: string;
    ring: string;
    border: string;
    text: string;
    dot: string;
    glow: string;
    softRing: string;
  }
> = {
  primary: {
    bg: 'bg-primary',
    gradient: 'bg-gradient-to-br from-primary to-primary/70',
    ring: 'ring-primary',
    border: 'border-primary',
    text: 'text-primary',
    dot: 'bg-primary',
    glow: 'shadow-[0_8px_24px_-6px_hsl(var(--p)/0.45)]',
    softRing: 'ring-primary/20',
  },
  secondary: {
    bg: 'bg-secondary',
    gradient: 'bg-gradient-to-br from-secondary to-secondary/70',
    ring: 'ring-secondary',
    border: 'border-secondary',
    text: 'text-secondary',
    dot: 'bg-secondary',
    glow: 'shadow-[0_8px_24px_-6px_hsl(var(--s)/0.45)]',
    softRing: 'ring-secondary/20',
  },
  success: {
    bg: 'bg-success',
    gradient: 'bg-gradient-to-br from-success to-success/70',
    ring: 'ring-success',
    border: 'border-success',
    text: 'text-success',
    dot: 'bg-success',
    glow: 'shadow-[0_8px_24px_-6px_hsl(var(--su)/0.45)]',
    softRing: 'ring-success/20',
  },
  warning: {
    bg: 'bg-warning',
    gradient: 'bg-gradient-to-br from-warning to-warning/70',
    ring: 'ring-warning',
    border: 'border-warning',
    text: 'text-warning',
    dot: 'bg-warning',
    glow: 'shadow-[0_8px_24px_-6px_hsl(var(--wa)/0.45)]',
    softRing: 'ring-warning/20',
  },
  error: {
    bg: 'bg-error',
    gradient: 'bg-gradient-to-br from-error to-error/70',
    ring: 'ring-error',
    border: 'border-error',
    text: 'text-error',
    dot: 'bg-error',
    glow: 'shadow-[0_8px_24px_-6px_hsl(var(--er)/0.45)]',
    softRing: 'ring-error/20',
  },
  info: {
    bg: 'bg-info',
    gradient: 'bg-gradient-to-br from-info to-info/70',
    ring: 'ring-info',
    border: 'border-info',
    text: 'text-info',
    dot: 'bg-info',
    glow: 'shadow-[0_8px_24px_-6px_hsl(var(--in)/0.45)]',
    softRing: 'ring-info/20',
  },
};

export type AccentColor = keyof typeof ACCENT_CLASSES;

export type IconStyle = 'solid' | 'regular' | 'light' | 'duotone' | 'thin' | 'brands';

export interface ActivityVisual {
  iconName: string;
  iconStyle: IconStyle;
  accentColor: AccentColor;
  label: string;
}

const ACTIVITY_VISUALS: Record<string, ActivityVisual> = {
  StartActivity: { iconName: 'play', iconStyle: 'solid', accentColor: 'success', label: 'Start' },
  EndActivity: { iconName: 'circle-stop', iconStyle: 'solid', accentColor: 'error', label: 'End' },
  TaskActivity: { iconName: 'user', iconStyle: 'solid', accentColor: 'primary', label: 'Task' },
  RoutingActivity: { iconName: 'code-branch', iconStyle: 'solid', accentColor: 'info', label: 'Routing' },
  CompanySelectionActivity: { iconName: 'building', iconStyle: 'solid', accentColor: 'info', label: 'Company Selection' },
  IfElseActivity: { iconName: 'code-fork', iconStyle: 'solid', accentColor: 'warning', label: 'If / Else' },
  SwitchActivity: { iconName: 'list-check', iconStyle: 'solid', accentColor: 'warning', label: 'Switch' },
  ForkActivity: { iconName: 'arrows-split-up-and-left', iconStyle: 'solid', accentColor: 'secondary', label: 'Fork' },
  JoinActivity: { iconName: 'code-merge', iconStyle: 'solid', accentColor: 'secondary', label: 'Join' },

  ApprovalActivity: { iconName: 'circle-check', iconStyle: 'solid', accentColor: 'success', label: 'Approval' },
  MeetingActivity: { iconName: 'users', iconStyle: 'solid', accentColor: 'info', label: 'Meeting' },
  AwaitSignalActivity: { iconName: 'signal-stream', iconStyle: 'solid', accentColor: 'info', label: 'Await Signal' },
  InternalFollowupSelectionActivity: { iconName: 'user-check', iconStyle: 'solid', accentColor: 'info', label: 'Internal Followup' },
  RequestSubmissionActivity: { iconName: 'file-lines', iconStyle: 'solid', accentColor: 'primary', label: 'Request Submission' },
  AdminReviewActivity: { iconName: 'clipboard-check', iconStyle: 'solid', accentColor: 'primary', label: 'Admin Review' },
  TimerActivity: { iconName: 'clock', iconStyle: 'solid', accentColor: 'warning', label: 'Timer' },
};

const FALLBACK_VISUAL: ActivityVisual = {
  iconName: 'diagram-project',
  iconStyle: 'solid',
  accentColor: 'primary',
  label: 'Activity',
};

export function getActivityVisual(type: string): ActivityVisual {
  return ACTIVITY_VISUALS[type] ?? FALLBACK_VISUAL;
}
