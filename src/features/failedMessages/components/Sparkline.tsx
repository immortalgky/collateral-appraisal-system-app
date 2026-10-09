import { useId } from 'react';
import { sparklineGeometry, SPARK_WIDTH, SPARK_HEIGHT } from '../utils/queueHealth';
import type { QueueSeverity } from '../utils/queueHealth';

const SEVERITY_TEXT_CLASS: Record<QueueSeverity, string> = {
  crit: 'text-red-500',
  warn: 'text-amber-500',
  ok: 'text-primary',
};

interface SparklineProps {
  samples: number[];
  severity: QueueSeverity;
}

const Sparkline = ({ samples, severity }: SparklineProps) => {
  const gradientId = `spark-gradient-${useId()}`;
  const geo = sparklineGeometry(samples);

  if (!geo) {
    return <div className="w-[124px] h-[30px] shrink-0" aria-hidden="true" />;
  }

  return (
    <svg
      className={SEVERITY_TEXT_CLASS[severity]}
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity=".35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1={SPARK_HEIGHT - 2}
        x2={SPARK_WIDTH}
        y2={SPARK_HEIGHT - 2}
        stroke="currentColor"
        strokeOpacity=".15"
        strokeWidth="1"
      />
      <path d={geo.area} fill={`url(#${gradientId})`} />
      <path
        d={geo.line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={geo.last.x} cy={geo.last.y} r="2.6" fill="currentColor" />
      <circle cx={geo.last.x} cy={geo.last.y} r="5" fill="currentColor" opacity=".25" />
    </svg>
  );
};

export default Sparkline;
