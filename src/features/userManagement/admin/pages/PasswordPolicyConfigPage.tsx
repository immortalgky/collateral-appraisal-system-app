import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import type { PasswordPolicyConfig } from '../../types';
import {
  useGetPasswordPolicyConfig,
  useUpdatePasswordPolicyConfig,
} from '../api/passwordPolicyAdmin';

const NumberField = ({
  label,
  hint,
  value,
  min,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
    <input
      type="number"
      min={min}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
    />
    {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
  </div>
);

const CheckboxField = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      className="size-4 rounded border-gray-300 text-primary focus:ring-primary/30"
    />
    {label}
  </label>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-white rounded-lg border border-gray-200 p-4">
    <h4 className="text-sm font-semibold text-gray-800 mb-3">{title}</h4>
    {children}
  </section>
);

function PasswordPolicyConfigPage() {
  const { t } = useTranslation(['userManagement', 'common']);
  const { data, isLoading } = useGetPasswordPolicyConfig();
  const updatePolicy = useUpdatePasswordPolicyConfig();

  const [draft, setDraft] = useState<PasswordPolicyConfig | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const set = <K extends keyof PasswordPolicyConfig>(key: K, value: PasswordPolicyConfig[K]) =>
    setDraft(prev => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = () => {
    if (!draft) return;
    updatePolicy.mutate(draft, {
      onSuccess: () => toast.success(t('passwordPolicyConfig.saved')),
      onError: () => toast.error(t('passwordPolicyConfig.saveFailed')),
    });
  };

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900">
          {t('passwordPolicyConfig.title')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('passwordPolicyConfig.subtitle')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('passwordPolicyConfig.propagationNote')}</p>
      </div>

      {/* Complexity */}
      <Section title={t('passwordPolicyConfig.complexity')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label={t('passwordPolicyConfig.requiredLength')}
            value={draft.requiredLength}
            min={1}
            onChange={v => set('requiredLength', v)}
          />
          <NumberField
            label={t('passwordPolicyConfig.requiredUniqueChars')}
            value={draft.requiredUniqueChars}
            min={0}
            onChange={v => set('requiredUniqueChars', v)}
          />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <CheckboxField
            label={t('passwordPolicyConfig.requireDigit')}
            checked={draft.requireDigit}
            onChange={v => set('requireDigit', v)}
          />
          <CheckboxField
            label={t('passwordPolicyConfig.requireLowercase')}
            checked={draft.requireLowercase}
            onChange={v => set('requireLowercase', v)}
          />
          <CheckboxField
            label={t('passwordPolicyConfig.requireUppercase')}
            checked={draft.requireUppercase}
            onChange={v => set('requireUppercase', v)}
          />
          <CheckboxField
            label={t('passwordPolicyConfig.requireNonAlphanumeric')}
            checked={draft.requireNonAlphanumeric}
            onChange={v => set('requireNonAlphanumeric', v)}
          />
        </div>
      </Section>

      {/* Lifecycle */}
      <Section title={t('passwordPolicyConfig.lifecycle')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label={t('passwordPolicyConfig.expiryDays')}
            hint={t('passwordPolicyConfig.expiryHint')}
            value={draft.expiryDays}
            min={0}
            onChange={v => set('expiryDays', v)}
          />
          <NumberField
            label={t('passwordPolicyConfig.historyCount')}
            hint={t('passwordPolicyConfig.historyHint')}
            value={draft.historyCount}
            min={0}
            onChange={v => set('historyCount', v)}
          />
        </div>
      </Section>

      {/* Lockout */}
      <Section title={t('passwordPolicyConfig.lockout')}>
        <div className="mb-4">
          <CheckboxField
            label={t('passwordPolicyConfig.lockoutEnabled')}
            checked={draft.lockoutEnabled}
            onChange={v => set('lockoutEnabled', v)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label={t('passwordPolicyConfig.maxFailedAccessAttempts')}
            value={draft.maxFailedAccessAttempts}
            min={1}
            onChange={v => set('maxFailedAccessAttempts', v)}
          />
          <NumberField
            label={t('passwordPolicyConfig.lockoutMinutes')}
            hint={t('passwordPolicyConfig.lockoutMinutesHint')}
            value={draft.lockoutMinutes}
            min={0}
            onChange={v => set('lockoutMinutes', v)}
          />
        </div>
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-amber-50 text-amber-700">
          <Icon name="triangle-exclamation" style="solid" className="size-3.5" />
          {t('passwordPolicyConfig.lockoutRestartNote')}
        </div>
      </Section>

      {/* Blocklist */}
      <Section title={t('passwordPolicyConfig.blocklist')}>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {t('passwordPolicyConfig.blocklistLabel')}
        </label>
        <textarea
          value={draft.blocklist}
          onChange={e => set('blocklist', e.target.value)}
          rows={5}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <p className="mt-1 text-xs text-gray-400">{t('passwordPolicyConfig.blocklistHint')}</p>
      </Section>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="sm"
          isLoading={updatePolicy.isPending}
          onClick={handleSave}
        >
          {t('passwordPolicyConfig.save')}
        </Button>
      </div>
    </div>
  );
}

export default PasswordPolicyConfigPage;
