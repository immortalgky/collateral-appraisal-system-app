import Icon from '@/shared/components/Icon';

interface ActiveFilterChipsProps {
  filters: Record<string, string>;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

const formatLabel = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();

function ActiveFilterChips({ filters, onRemove, onClearAll }: ActiveFilterChipsProps) {
  const active = Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined);
  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500">Filters:</span>
      {active.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
        >
          <span className="font-medium">{formatLabel(key)}:</span> {value}
          <button
            onClick={() => onRemove(key)}
            aria-label={`Remove ${formatLabel(key)} filter`}
            className="hover:text-primary/70 ml-0.5"
          >
            <Icon style="solid" name="xmark" className="size-3" />
          </button>
        </span>
      ))}
      <button onClick={onClearAll} className="text-xs text-gray-500 hover:text-gray-700 underline">
        Clear all
      </button>
    </div>
  );
}

export default ActiveFilterChips;
