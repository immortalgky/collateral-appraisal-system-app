import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import clsx from 'clsx';
import {
  createContext,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

interface TabsContextType {}
const TabsContext = createContext<TabsContextType>({});

interface TabsProps {
  children: ReactNode;
}

interface TabsChildrenProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

const Tabs = ({ children }: TabsProps) => {
  return (
    <TabsContext.Provider value={{}}>
      <TabGroup className={clsx('flex flex-col gap-4')}>{children}</TabGroup>
    </TabsContext.Provider>
  );
};

Tabs.List = ({ children, ...props }: TabsChildrenProps) => {
  return (
    <TabList className={clsx('flex', 'gap-4')} {...props}>
      {children}
    </TabList>
  );
};

Tabs.Tab = ({ children, ...props }: TabProps) => {
  return (
    <Tab
      className={clsx(
        'py-2 uppercase',
        'text-misc-2 data-selected:text-neutral-5 font-bold data-selected:border-b data-selected:border-misc-4',
      )}
      {...props}
    >
      {children}
    </Tab>
  );
};

Tabs.Panels = ({ children, ...props }: TabsChildrenProps) => (
  <TabPanels {...props}>{children}</TabPanels>
);
Tabs.Panel = ({ children, ...props }: TabsChildrenProps) => (
  <TabPanel {...props}>{children}</TabPanel>
);

export default Tabs;
