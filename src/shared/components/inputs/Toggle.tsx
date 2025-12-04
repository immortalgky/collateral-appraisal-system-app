import { Switch, type SwitchProps } from '@headlessui/react';
import clsx from 'clsx';

interface ToggleProps extends SwitchProps {
  label?: string;
  options: [string, string];
  error?: string;
  required?: boolean;
}

const Toggle = ({ label, options, error, required, className, ...props }: ToggleProps) => {
  return (
    <div className={clsx('text-sm', className)}>
      <fieldset>
        {label && (
          <legend className="font-medium text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </legend>
        )}
        <div
          className={clsx(
            'inline-flex p-1 rounded-full border transition-colors duration-200',
            error ? 'border-danger bg-danger-50' : 'border-gray-200 bg-gray-50',
          )}
        >
          <Switch className="flex flex-row relative" {...props}>
            <span className="sr-only">{`Toggle between ${options.join(' and ')}`}</span>
            {options.map((option, index) => {
              const isActive =
                (props.checked && index === 0) || (!props.checked && index === 1);
              return (
                <div
                  key={index}
                  className={clsx(
                    'py-2 px-4 rounded-full transition-all duration-200 cursor-pointer select-none',
                    isActive
                      ? 'bg-primary text-white shadow-sm font-medium'
                      : 'text-gray-600 hover:text-gray-800',
                  )}
                >
                  <span>{option}</span>
                </div>
              );
            })}
          </Switch>
        </div>
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </fieldset>
    </div>
  );
};

export default Toggle;
