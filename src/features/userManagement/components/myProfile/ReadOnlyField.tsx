interface ReadOnlyFieldProps {
  label: string;
  value?: React.ReactNode;
}

/** Label + value pair for the parts of a profile the user cannot edit. */
const ReadOnlyField = ({ label, value }: ReadOnlyFieldProps) => {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`mt-0.5 text-sm ${
          isEmpty ? 'text-gray-400' : 'text-gray-900 dark:text-base-content'
        }`}
      >
        {isEmpty ? '—' : value}
      </p>
    </div>
  );
};

export default ReadOnlyField;
