import { useEffect, useId, useState } from 'react';
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
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max?: number;
  onChange: (v: number) => void;
}) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-(--palette-ink) mb-1">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 text-sm border border-(--palette-line) rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-(--palette-gray-400)">
          {hint}
        </p>
      )}
    </div>
  );
};

const CheckboxField = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => {
  const id = useId();
  return (
    <>
      <label className="flex items-center gap-2 text-sm text-(--palette-ink) cursor-pointer">
        <input
          type="checkbox"
          aria-describedby={hint ? `${id}-hint` : undefined}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="size-4 rounded border-(--palette-line-strong) text-(--palette-primary-text) focus:ring-primary/30"
        />
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 ml-6 text-xs text-(--palette-gray-400)">
          {hint}
        </p>
      )}
    </>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-(--palette-surface) rounded-lg border border-(--palette-line) p-4">
    <h4 className="text-sm font-semibold text-(--palette-ink) mb-3">{title}</h4>
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
        <Icon
          name="spinner"
          style="solid"
          className="w-5 h-5 animate-spin text-(--palette-gray-400)"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-(--palette-ink)">
          {t('passwordPolicyConfig.title')}
        </h3>
        <p className="text-xs text-(--palette-gray-500) mt-0.5">
          {t('passwordPolicyConfig.subtitle')}
        </p>
        <p className="text-xs text-(--palette-gray-400) mt-1">
          {t('passwordPolicyConfig.propagationNote')}
        </p>
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
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-(--palette-warn-wash) text-(--palette-warn)">
          <Icon name="triangle-exclamation" style="solid" className="size-3.5" />
          {t('passwordPolicyConfig.lockoutRestartNote')}
        </div>
      </Section>

      {/* Two-factor authentication */}
      <Section title={t('passwordPolicyConfig.twoFactorSection')}>
        <div className="mb-4">
          <CheckboxField
            label={t('passwordPolicyConfig.requireTwoFactorForExternal')}
            checked={draft.requireTwoFactorForExternal}
            hint={t('passwordPolicyConfig.requireTwoFactorForExternalHint')}
            onChange={v => set('requireTwoFactorForExternal', v)}
          />
        </div>
        <NumberField
          label={t('passwordPolicyConfig.twoFactorRememberHours')}
          hint={t('passwordPolicyConfig.twoFactorRememberHoursHint')}
          value={draft.twoFactorRememberHours}
          min={0}
          max={720}
          onChange={v => set('twoFactorRememberHours', v)}
        />
      </Section>

      {/* Temporary Access */}
      <Section title={t('passwordPolicyConfig.temporaryAccessSection')}>
        <NumberField
          label={t('passwordPolicyConfig.maxAccessWindowHours')}
          hint={t('passwordPolicyConfig.maxAccessWindowHoursHint')}
          value={draft.maxAccessWindowHours}
          min={1}
          max={720}
          onChange={v => set('maxAccessWindowHours', v)}
        />
      </Section>

      {/* Blocklist */}
      <Section title={t('passwordPolicyConfig.blocklist')}>
        <label className="block text-xs font-medium text-(--palette-ink) mb-1">
          {t('passwordPolicyConfig.blocklistLabel')}
        </label>
        <textarea
          value={draft.blocklist}
          onChange={e => set('blocklist', e.target.value)}
          rows={5}
          className="w-full px-3 py-2 text-sm border border-(--palette-line) rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <p className="mt-1 text-xs text-(--palette-gray-400)">
          {t('passwordPolicyConfig.blocklistHint')}
        </p>
      </Section>

      <div className="flex justify-end">
        <Button variant="primary" size="sm" isLoading={updatePolicy.isPending} onClick={handleSave}>
          {t('passwordPolicyConfig.save')}
        </Button>
      </div>
    </div>
  );
}

export default PasswordPolicyConfigPage;
