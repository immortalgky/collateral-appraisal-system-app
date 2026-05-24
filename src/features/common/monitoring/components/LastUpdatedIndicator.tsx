import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';

interface LastUpdatedIndicatorProps {
  dataUpdatedAt: number;
  onRefresh: () => void;
  isRefetching: boolean;
}

function LastUpdatedIndicator({ dataUpdatedAt, onRefresh, isRefetching }: LastUpdatedIndicatorProps) {
  const { t } = useTranslation('monitoring');
  const [relativeTime, setRelativeTime] = useState('');
  const [isPulsing, setIsPulsing] = useState(false);
  const prevUpdatedAtRef = useRef<number | undefined>(undefined);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Relative time ticker
  useEffect(() => {
    function update() {
      if (dataUpdatedAt === 0) {
        setRelativeTime('');
        return;
      }
      setRelativeTime(formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true }));
    }

    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  // Pulse on fresh refetch
  useEffect(() => {
    if (dataUpdatedAt === 0) return;
    if (prevUpdatedAtRef.current !== undefined && prevUpdatedAtRef.current !== dataUpdatedAt) {
      // A new successful fetch landed — trigger pulse
      if (pulseTimerRef.current !== undefined) clearTimeout(pulseTimerRef.current);
      setIsPulsing(true);
      pulseTimerRef.current = setTimeout(() => {
        setIsPulsing(false);
        pulseTimerRef.current = undefined;
      }, 5_000);
    }
    prevUpdatedAtRef.current = dataUpdatedAt;
  }, [dataUpdatedAt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pulseTimerRef.current !== undefined) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  if (dataUpdatedAt === 0) return null;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Live indicator dot */}
      <span className="relative flex size-1.5 shrink-0">
        <span className="size-1.5 rounded-full bg-emerald-500 relative z-10" />
        {isPulsing && (
          <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
        )}
      </span>

      <span className="text-[11px] text-gray-400">
        {t('common.updatedAgo', { value: relativeTime })}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefetching}
        aria-label={t('common.refresh')}
        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40"
      >
        <Icon
          style="solid"
          name="arrows-rotate"
          className={`size-3 ${isRefetching ? 'animate-spin' : ''}`}
        />
      </button>
    </div>
  );
}

export default LastUpdatedIndicator;
