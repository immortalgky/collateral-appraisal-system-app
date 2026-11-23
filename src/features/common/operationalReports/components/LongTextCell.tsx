/**
 * Free-text cell for long comments: capped width and two lines, full text (line breaks included)
 * in the native hover title. Blank text shows "—" like any empty cell, with no title.
 */
function LongTextCell({ text }: { text: string }) {
  if (text.trim() === '') return <>—</>;
  return (
    <div className="max-w-[240px] line-clamp-2 whitespace-pre-line break-words" title={text}>
      {text.trim().replace(/\n{2,}/g, '\n')}
    </div>
  );
}

export default LongTextCell;
