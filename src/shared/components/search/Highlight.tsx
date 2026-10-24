import { MIN_SEARCH_LENGTH } from '@shared/api/search';

/** Thai and full-width digits as 0-9, one code unit each, so offsets are unchanged. */
const asciiDigits = (s: string) =>
  s
    .replace(/[๐-๙]/g, d => String(d.charCodeAt(0) - 0x0e50))
    .replace(/[０-９]/g, d => String(d.charCodeAt(0) - 0xff10));

/**
 * The matched part of the term in bold-tinted text. `*` is the search wildcard, so the longest run
 * between wildcards is what gets marked. Below MIN_SEARCH_LENGTH (counted like the server, `*`
 * included) the term is not searched at all, so nothing is marked.
 *
 * `appraisalNumber` reads the term's Thai and full-width digits as 0-9, as the server does for that
 * field only ('๖๙๑๐๕' finds 69105). Every other field is matched as typed, and stored text is never
 * folded.
 */
const Highlight = ({
  text,
  term,
  appraisalNumber = false,
}: {
  text: string | null | undefined;
  term: string | undefined;
  appraisalNumber?: boolean;
}) => {
  if (!text) return <>—</>;
  const trimmed = (term ?? '').trim();
  if (trimmed.length < MIN_SEARCH_LENGTH) return <>{text}</>;
  const longest = trimmed
    .split('*')
    .reduce((a, b) => (b.length > a.length ? b : a))
    .toLowerCase();
  const needle = appraisalNumber ? asciiDigits(longest) : longest;
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
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
