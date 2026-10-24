import { MIN_SEARCH_LENGTH } from '@shared/api/search';

/**
 * The matched part of the term in bold-tinted text. A leading * only asks for a substring match.
 * Below MIN_SEARCH_LENGTH the term is not searched at all, so nothing is marked.
 */
const Highlight = ({
  text,
  term,
}: {
  text: string | null | undefined;
  term: string | undefined;
}) => {
  if (!text) return <>—</>;
  const needle = (term ?? '').trim().replace(/^\*/, '').toLowerCase();
  if (needle.length < MIN_SEARCH_LENGTH) return <>{text}</>;
  const at = text.toLowerCase().indexOf(needle);
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
