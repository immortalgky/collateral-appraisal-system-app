interface SidebarLabelProps {
  children: React.ReactNode;
}

const SidebarLabel = ({ children }: SidebarLabelProps) => (
  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{children}</div>
);

export default SidebarLabel;
