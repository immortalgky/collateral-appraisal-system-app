import { MIN_SEARCH_LENGTH } from '@shared/api/search';

/**
 * Lower case, with Thai and full-width digits read as 0-9, so '๖๙๑๐๕' finds 69105 the way the
 * server's number search does, and '๑๒๓๔' still finds a deed stored in Thai numerals. Every
 * replacement is one code unit, so offsets into the folded text are offsets into the original.
 */
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/[๐-๙]/g, d => String(d.charCodeAt(0) - 0x0e50))
    .replace(/[０-９]/g, d => String(d.charCodeAt(0) - 0xff10));

/**
 * The matched part of the term in bold-tinted text. `*` is the search wildcard, so the longest run
 * between wildcards is what gets marked. Below MIN_SEARCH_LENGTH (counted like the server, `*`
 * included) the term is not searched at all, so nothing is marked.
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
  const needle = fold(trimmed.split('*').reduce((a, b) => (b.length > a.length ? b : a)));
  const at = needle ? fold(text).indexOf(needle) : -1;
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
