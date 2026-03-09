import type { ReactNode } from 'react';

interface ActionBarProps {
  children: ReactNode;
}

const ActionBar = ({ children }: ActionBarProps) => (
  <div
    role="toolbar"
    aria-label="Page actions"
    className="shrink-0 sticky bottom-0 z-40 bg-white border-t border-gray-200 px-6 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
  >
    <div className="flex justify-between items-center">{children}</div>
  </div>
);

const Left = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-3">{children}</div>
);

const Right = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-3">{children}</div>
);

const Divider = () => <div className="h-6 w-px bg-gray-200" aria-hidden="true" />;

const UnsavedIndicator = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Unsaved changes
    </span>
  );
};

ActionBar.Left = Left;
ActionBar.Right = Right;
ActionBar.Divider = Divider;
ActionBar.UnsavedIndicator = UnsavedIndicator;

export default ActionBar;
