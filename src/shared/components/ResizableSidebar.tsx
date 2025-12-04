import { createContext, useContext, type HTMLAttributes, type ReactNode } from 'react';
import Icon from './Icon';
import clsx from 'clsx';

interface ResizableSidebarProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  openedWidth: string;
  closedWidth?: string;
}

interface SidebarContextType {
  isOpen: boolean;
  onToggle: () => void;
  openedWidth: string;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const ResizableSidebar = ({
  isOpen,
  onToggle,
  children,
  openedWidth,
}: ResizableSidebarProps) => {
  return (
    <SidebarContext.Provider value={{ isOpen, onToggle, openedWidth }}>
      <div className="relative flex flex-row overflow-hidden">{children}</div>
    </SidebarContext.Provider>
  );
};

const Main = ({ children }: { children: ReactNode }) => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('Main must be used within ResizableSidebar');
  }
  const { isOpen, onToggle } = context;

  return (
    <div className="flex-1 min-w-0 p-6 overflow-hidden relative">
      {/* Toggle button - shows when sidebar is closed */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all"
          title="Open panel"
        >
          <Icon style="solid" name="sidebar" className="size-4" />
        </button>
      )}
      {children}
    </div>
  );
};

const Sidebar = ({ children }: { children: ReactNode }) => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('Sidebar must be used within ResizableSidebar');
  }
  const { isOpen, onToggle, openedWidth } = context;

  if (!isOpen) return null;

  return (
    <div
      className={clsx(
        'flex flex-col flex-none border-l border-gray-100 transition-all duration-200 sticky top-0 self-start max-h-[calc(100vh-12rem)] overflow-y-auto',
        openedWidth,
        'p-4',
      )}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onToggle}
        className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all mb-2 shrink-0"
        title="Close panel"
      >
        <Icon style="solid" name="xmark" className="size-3.5" />
      </button>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
};

ResizableSidebar.Sidebar = Sidebar;
ResizableSidebar.Main = Main;

export default ResizableSidebar;
