import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Input from '@shared/components/Input';

interface UriListEditorProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** A required list always shows at least one (blank) row; an optional one shows only "add". */
  required?: boolean;
  hint?: string;
  /** Names each row for screen readers: "<ariaLabel> 1". */
  ariaLabel: string;
}

/** One input per URI with a remove button, plus an "add" button. */
const UriListEditor = ({
  label,
  values,
  onChange,
  required = false,
  hint,
  ariaLabel,
}: UriListEditorProps) => {
  const { t } = useTranslation('oauthAdmin');
  const rows = required && values.length === 0 ? [''] : values;

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-(--palette-ink)">
        {label}
        {required && <span className="ml-0.5 text-(--palette-req)">*</span>}
      </span>
      {rows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {rows.map((uri, index) => (
            <div key={index} className="flex items-center gap-1">
              <Input
                value={uri}
                onChange={e => onChange(rows.map((v, i) => (i === index ? e.target.value : v)))}
                placeholder="https://"
                aria-label={`${ariaLabel} ${index + 1}`}
                className="font-mono"
              />
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                aria-label={t('clients.drawer.removeUri', { n: index + 1 })}
                title={t('clients.drawer.removeUri', { n: index + 1 })}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-(--palette-gray-400) hover:bg-danger/10 hover:text-danger"
              >
                <Icon name="xmark" style="regular" className="text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className={rows.length > 0 ? 'mt-2' : undefined}
        onClick={() => onChange([...rows, ''])}
        leftIcon={<Icon name="plus" style="regular" className="text-xs" />}
      >
        {t('clients.drawer.addUri')}
      </Button>
      {hint && <p className="mt-1 text-xs text-(--palette-ink-2)">{hint}</p>}
    </div>
  );
};

export default UriListEditor;
