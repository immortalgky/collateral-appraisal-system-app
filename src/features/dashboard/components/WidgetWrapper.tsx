type WidgetWrapperProps = {
  id: string;
  children: React.ReactNode;
  className?: string;
};

function WidgetWrapper({ children, className = '' }: WidgetWrapperProps) {
  return <div className={`h-full ${className}`}>{children}</div>;
}

export default WidgetWrapper;
