import { createContext, useContext, type HTMLAttributes, type ReactNode } from 'react';
import Icon from './Icon';
import clsx from 'clsx';

interface ResizableSidebarProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  openedWidth: string;
  closedWidth: string;
}

interface ResizeButtonProps {
  onClick: () => void;
}

interface SidebarContextType {
  isOpen: boolean;
  onToggle: () => void;
  openedWidth: string;
  closedWidth: string;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const ResizableSidebar = ({
  isOpen,
  onToggle,
  children,
  openedWidth,
  closedWidth,
}: ResizableSidebarProps) => {
  return (
    <SidebarContext.Provider value={{ isOpen, onToggle, openedWidth, closedWidth }}>
      <div className="flex flex-row divide-x">{children}</div>
    </SidebarContext.Provider>
  );
};

const Main = ({ children }: { children: ReactNode }) => {
  return <div className="flex-auto p-6 border-gray-200">{children}</div>;
};

const Sidebar = ({ children }: { children: ReactNode }) => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('Sidebar must be used within ResizableSidebar');
  }
  const { isOpen, onToggle, openedWidth, closedWidth } = context;

  return (
    <div
      className={clsx(
        'm-6',
        'flex',
        'flex-col',
        'flex-none',
        'gap-8',
        isOpen ? openedWidth : closedWidth,
        'transition-all',
      )}
    >
      <div>
        <ResizeButton onClick={onToggle} />
      </div>
      {isOpen ? <div>{children}</div> : <div></div>}
    </div>
  );
};

const ResizeButton = ({ onClick }: ResizeButtonProps) => {
  return (
    <div onClick={onClick}>
      <Icon style="light" name="angles-right" className="text-stone-300" />
    </div>
  );
};

ResizableSidebar.Sidebar = Sidebar;
ResizableSidebar.Main = Main;

export default ResizableSidebar;
