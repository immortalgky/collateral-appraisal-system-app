import { Trans, useTranslation } from 'react-i18next';

/** Locale strings that carry a `<strong>{{value}}</strong>` around one interpolated name or number. */
type BoldKey =
  | 'cancel.bodyRich'
  | 'cancel.draftBody'
  | 'cancel.standaloneBody'
  | 'finalize.awardBody'
  | 'finalize.awardBodyAssigning'
  | 'rejectWinner.body'
  | 'selectWinner.bodyRich'
  | 'shared.quotationAwarded'
  | 'shortlist.sendToRmBody';

interface BoldTransProps {
  i18nKey: BoldKey;
  values: Record<string, string | number>;
  strongClassName?: string;
}

/**
 * A translated sentence with one bold interpolated value. The values are interpolated into the
 * string before <Trans> parses its tags, so they are escaped and then unescaped as text: a company
 * name with markup stays text and cannot add elements. Replaces dangerouslySetInnerHTML.
 */
const BoldTrans = ({ i18nKey, values, strongClassName }: BoldTransProps) => {
  const { t } = useTranslation('quotation');
  return (
    <Trans
      t={t}
      ns="quotation"
      i18nKey={i18nKey}
      values={values}
      tOptions={{ interpolation: { escapeValue: true } }}
      shouldUnescape
      components={{ strong: <strong className={strongClassName} /> }}
    />
  );
};

export default BoldTrans;
