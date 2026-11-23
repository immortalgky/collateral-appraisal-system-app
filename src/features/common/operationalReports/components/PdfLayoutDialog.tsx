import { useId, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Modal from '@shared/components/Modal';
import Dropdown from '@shared/components/inputs/Dropdown';
import NumberInput from '@shared/components/inputs/NumberInput';
import { ERROR_TEXT, HELPER_TEXT } from '@shared/components/inputs/controlStyles';
import {
  PDF_FONT_MAX,
  PDF_FONT_MIN,
  loadPdfLayout,
  savePdfLayout,
  type PdfLayout,
} from '../api/operationalReportsApi';

const FONT_PRESETS = [9, 10, 11, 12, 13, 14];
const CUSTOM = 'custom';
const range = { min: PDF_FONT_MIN, max: PDF_FONT_MAX };

function PdfLayoutForm({
  onCancel,
  onExport,
}: {
  onCancel: () => void;
  onExport: (layout: PdfLayout) => void;
}) {
  const { t } = useTranslation('operationalReports');
  const { t: tc } = useTranslation('common');
  // Mounted fresh each time the dialog opens, so this re-reads the remembered choice.
  const [initial] = useState(loadPdfLayout);
  const [orientation, setOrientation] = useState(initial.orientation);
  const [overflow, setOverflow] = useState(initial.overflow);
  // A remembered size outside the presets reopens as Custom with the number filled in.
  const [fontChoice, setFontChoice] = useState(
    FONT_PRESETS.includes(initial.fontSize) ? String(initial.fontSize) : CUSTOM,
  );
  const [customSize, setCustomSize] = useState<number | null>(initial.fontSize);

  const [fontFocused, setFontFocused] = useState(false);

  const isCustom = fontChoice === CUSTOM;
  const fontSize = isCustom ? customSize : Number(fontChoice);
  const fontValid = fontSize != null && fontSize >= PDF_FONT_MIN && fontSize <= PDF_FONT_MAX;
  const fontMsgId = useId();
  const showFontError = !fontFocused && !fontValid;

  const orientations = [
    { value: 'portrait', label: t('pdf.orientation.portrait') },
    { value: 'landscape', label: t('pdf.orientation.landscape') },
  ];
  const overflows = [
    { value: 'fit', label: t('pdf.overflow.fit') },
    { value: 'split', label: t('pdf.overflow.split') },
  ];
  const fontOptions = [
    ...FONT_PRESETS.map(n => ({ value: String(n), label: t('pdf.fontSize.option', { n }) })),
    { value: CUSTOM, label: t('pdf.fontSize.custom') },
  ];

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={e => {
        e.preventDefault();
        if (!fontValid) return;
        const layout = { orientation, overflow, fontSize };
        savePdfLayout(layout);
        onExport(layout);
      }}
    >
      <Dropdown
        label={t('pdf.orientation.label')}
        aria-label={t('pdf.orientation.label')}
        options={orientations}
        value={orientation}
        showValuePrefix={false}
        showPlaceholderOption={false}
        onChange={v => setOrientation(v as PdfLayout['orientation'])}
      />

      <div>
        <Dropdown
          label={t('pdf.overflow.label')}
          aria-label={t('pdf.overflow.label')}
          options={overflows}
          value={overflow}
          showValuePrefix={false}
          showPlaceholderOption={false}
          onChange={v => setOverflow(v as PdfLayout['overflow'])}
        />
        <p className={clsx('mt-1.5', HELPER_TEXT)}>
          {overflow === 'fit' ? t('pdf.overflow.fitHelp') : t('pdf.overflow.splitHelp')}
        </p>
      </div>

      <div>
        <Dropdown
          label={t('pdf.fontSize.label')}
          aria-label={t('pdf.fontSize.label')}
          options={fontOptions}
          value={fontChoice}
          showValuePrefix={false}
          showPlaceholderOption={false}
          onChange={(v: string) => {
            // Switching to Custom starts from the size currently shown, not the opening one.
            if (v === CUSTOM && fontChoice !== CUSTOM) setCustomSize(Number(fontChoice));
            setFontChoice(v);
          }}
        />
        {/* Fit shrinks the table below this size to make the columns fit; split uses it exactly. */}
        {overflow === 'fit' && (
          <p className={clsx('mt-1.5', HELPER_TEXT)}>
            {t('pdf.fontSize.fitHelp', { min: PDF_FONT_MIN })}
          </p>
        )}
      </div>

      {isCustom && (
        <div className="-mt-2">
          {/* Focus events bubble: a wrapper, since NumberInput's own onFocus selects the text. */}
          <div onFocus={() => setFontFocused(true)} onBlur={() => setFontFocused(false)}>
            <NumberInput
              aria-label={t('pdf.fontSize.customLabel')}
              suffix="px"
              decimalPlaces={0}
              thousandSeparator={false}
              maxIntegerDigits={2}
              max={PDF_FONT_MAX}
              value={customSize}
              onChange={e => setCustomSize(e.target.value)}
              // Red edge and message wait for blur, so "1" on the way to "12" doesn't flash; the
              // range hint and the error share one reserved line below, so neither moves the footer.
              invalid={showFontError}
              aria-invalid={!fontValid}
              aria-describedby={fontMsgId}
            />
          </div>
          <p id={fontMsgId} className={clsx('mt-1 min-h-4', fontValid ? HELPER_TEXT : ERROR_TEXT)}>
            {fontValid ? (
              t('pdf.fontSize.hint', range)
            ) : (
              <>
                <span className={fontFocused ? 'sr-only' : undefined}>
                  {t('pdf.fontSize.error', range)}
                </span>
                {/* Focused and mid-edit: keep the range visible, the error is for assistive tech. */}
                {fontFocused && (
                  <span aria-hidden className={HELPER_TEXT}>
                    {t('pdf.fontSize.hint', range)}
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-(--palette-line) pt-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc('actions.cancel')}
        </Button>
        <Button type="submit" disabled={!fontValid}>
          {tc('actions.export')}
        </Button>
      </div>
    </form>
  );
}

interface PdfLayoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (layout: PdfLayout) => void;
}

/** Layout choices for the PDF export; Excel / CSV skip this and download straight away. */
function PdfLayoutDialog({ isOpen, onClose, onExport }: PdfLayoutDialogProps) {
  const { t } = useTranslation('operationalReports');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('pdf.title')} size="sm" compact>
      <PdfLayoutForm onCancel={onClose} onExport={onExport} />
    </Modal>
  );
}

export default PdfLayoutDialog;
