import { Switch as HeadlessSwitch } from '@headlessui/react';

interface SuspensionSwitchProps {
  /** On = suspended. */
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}

/** Gray when active, red when suspended. Local: the shared Switch has no red-when-on variant. */
const SuspensionSwitch = ({ checked, onChange, ariaLabel }: SuspensionSwitchProps) => (
  <HeadlessSwitch
    checked={checked}
    onChange={onChange}
    title={ariaLabel}
    className="group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-300 transition-colors duration-200 ease-in-out data-checked:bg-red-500 dark:bg-gray-600 dark:data-checked:bg-red-500"
  >
    <span className="sr-only">{ariaLabel}</span>
    <span className="pointer-events-none inline-block h-5 w-5 translate-x-0.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out group-data-checked:translate-x-5" />
  </HeadlessSwitch>
);

export default SuspensionSwitch;
