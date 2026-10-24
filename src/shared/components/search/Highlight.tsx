import { MIN_SEARCH_LENGTH } from '@shared/api/search';

/** Thai and full-width digits as 0-9, one code unit each, so offsets are unchanged. */
const asciiDigits = (s: string) => s.replace(/[๐-๙０-９]/g, d => String(d.charCodeAt(0) & 0xf));

/**
 * The matched part of the term in bold-tinted text. `*` is the search wildcard, so the longest run
 * between wildcards is what gets marked. Below MIN_SEARCH_LENGTH (counted like the server, `*`
 * included) the term is not searched at all, so nothing is marked.
 *
 * The term is looked for as typed, then with its digits as 0-9: the server reads '๖๙๑๐๕' as
 * 69105 for an appraisal number, but never folds stored text, so an ASCII term must not mark
 * Thai digits in a cell.
 */
const Highlight = ({
  text,
  term,
}: {
  text: string | null | undefined;
  term: string | undefined;
}) => {
  if (!text) return <>—</>;
  const trimmed = (term ?? '').trim();
  if (trimmed.length < MIN_SEARCH_LENGTH) return <>{text}</>;
  const needle = trimmed
    .split('*')
    .reduce((a, b) => (b.length > a.length ? b : a))
    .toLowerCase();
  const lower = text.toLowerCase();
  const at = !needle
    ? -1
    : lower.includes(needle)
      ? lower.indexOf(needle)
      : lower.indexOf(asciiDigits(needle));
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-amber-100 px-px text-inherit">
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </>
  );
};

export default Highlight;
