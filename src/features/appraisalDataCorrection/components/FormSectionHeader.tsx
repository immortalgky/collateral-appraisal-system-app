import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';

/**
 * The section header the create/edit screens put above each detail form — icon chip, heading,
 * hairline rule. Copied deliberately: those screens split their sections across tabs, which a
 * correction screen has no use for, so the headers are what tells the admin where the land
 * block ends and the building block begins on one continuous page.
 *
 * `tone` names the same colour each type carries on its own create screen, so the land block
 * still reads amber and the building block still reads blue.
 *
 * The heading is looked up here rather than passed in, so the registry stays free of hooks and
 * of i18next's `t` — threading that overloaded function through a plain callback parameter is
 * what made `tsc` crash outright with "No error for last overload signature".
 */
export type SectionTone = 'land' | 'building' | 'condo' | 'lease' | 'machinery' | 'generated';

const TONE: Record<SectionTone, { bg: string; fg: string; icon: string }> = {
  land: { bg: 'bg-amber-100', fg: 'text-amber-600', icon: 'mountain-sun' },
  building: { bg: 'bg-blue-100', fg: 'text-blue-600', icon: 'building' },
  condo: { bg: 'bg-violet-100', fg: 'text-violet-600', icon: 'building' },
  lease: { bg: 'bg-purple-100', fg: 'text-purple-600', icon: 'file-contract' },
  machinery: { bg: 'bg-amber-100', fg: 'text-amber-600', icon: 'mountain-sun' },
  generated: { bg: 'bg-slate-100', fg: 'text-slate-600', icon: 'car' },
};

const FormSectionHeader = ({ tone, titleKey }: { tone: SectionTone; titleKey: string }) => {
  // The create screens' namespace: same strings, not a second copy that drifts.
  const { t } = useTranslation('appraisal');
  const { bg, fg, icon } = TONE[tone];
  const title = t(titleKey as never, { defaultValue: titleKey });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon name={icon} style="solid" className={`w-5 h-5 ${fg}`} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="h-px bg-gray-200" />
    </div>
  );
};

export default FormSectionHeader;
