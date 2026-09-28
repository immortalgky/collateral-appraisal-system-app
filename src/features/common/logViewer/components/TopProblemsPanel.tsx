import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  isKnownLevel,
  levelLookup,
  logLevelBadgeClass,
  NEUTRAL_BADGE_CLASS,
  type LogTopProblem,
} from '../types';
import { topProblemToQuery } from '../utils/topProblemQuery';

interface TopProblemsPanelProps {
  topProblems: LogTopProblem[];
  onSelect: (query: string) => void;
  /** Same convention as MachineEventsList: include the date once the selected range spans more
   * than 24h, since "Last seen 14:32" is ambiguous once the range covers more than one day. */
  showDate: boolean;
}

const TopProblemsPanel = ({ topProblems, onSelect, showDate }: TopProblemsPanelProps) => {
  const { t } = useTranslation('logAdmin');

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-900">{t('sidebar.topProblemsTitle')}</h2>
      <p className="text-xs text-gray-500 mt-0.5">{t('sidebar.topProblemsSubtitle')}</p>
      <ul className="flex flex-col gap-1 mt-2.5">
        {topProblems.length === 0 && (
          <li className="text-xs text-gray-400 py-2">{t('sidebar.topProblemsEmpty')}</li>
        )}
        {topProblems.map((problem, index) => (
          <li key={`${problem.template}__${problem.exceptionType ?? ''}__${index}`}>
            <button
              type="button"
              onClick={() => onSelect(topProblemToQuery(problem))}
              className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-gray-50 grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5"
            >
              <span className="text-xs text-gray-800 line-clamp-2 flex items-start gap-1.5">
                <span
                  className={`shrink-0 mt-0.5 inline-flex items-center justify-center size-3.5 rounded-full text-[9px] font-bold ${levelLookup(logLevelBadgeClass, problem.level, NEUTRAL_BADGE_CLASS)}`}
                >
                  {isKnownLevel(problem.level) ? problem.level[0] : '?'}
                </span>
                {problem.exceptionType && (
                  <span className="text-gray-400 font-normal">{problem.exceptionType}: </span>
                )}
                {problem.sampleMessage}
              </span>
              <span className="text-xs font-semibold tabular-nums text-gray-700">
                {problem.count.toLocaleString()}×
              </span>
              <span className="col-span-2 text-[11px] text-gray-400">
                {t('sidebar.topProblemsLastSeen', {
                  time: format(new Date(problem.lastSeen), showDate ? 'd/M HH:mm' : 'HH:mm'),
                })}
                {problem.sourceContext && ` · ${problem.sourceContext.split('.').at(-1)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TopProblemsPanel;
