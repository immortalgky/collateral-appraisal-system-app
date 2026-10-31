import { useEffect, useMemo, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import {
  Table as BaseTable,
  TableRow,
  TableHeader as BaseTableHeader,
  TableCell as BaseTableCell,
} from '@tiptap/extension-table';
import clsx from 'clsx';
import Icon from './Icon';

const styleAttribute = {
  style: {
    default: null as string | null,
    parseHTML: (element: HTMLElement) => element.getAttribute('style'),
    renderHTML: (attributes: { style?: string | null }) =>
      attributes.style ? { style: attributes.style } : {},
  },
};

const Table = BaseTable.extend({
  addAttributes() {
    return { ...this.parent?.(), ...styleAttribute };
  },
});
const TableHeader = BaseTableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...styleAttribute };
  },
});
const TableCell = BaseTableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...styleAttribute };
  },
});

/** Marks every match of `pattern` in the text with `className`, without changing the HTML. */
const patternHighlight = (pattern: RegExp, className: string) => {
  const global = new RegExp(pattern.source, pattern.flags.replace('g', '') + 'g');
  const find = (doc: ProseMirrorNode) => {
    const marks: Decoration[] = [];
    doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      for (const m of node.text.matchAll(global)) {
        const from = pos + (m.index ?? 0);
        marks.push(Decoration.inline(from, from + m[0].length, { class: className }));
      }
    });
    return DecorationSet.create(doc, marks);
  };
  return Extension.create({
    name: 'patternHighlight',
    addProseMirrorPlugins() {
      // Rescanned only when the text changes, not on every caret move.
      const plugin: Plugin<DecorationSet> = new Plugin({
        state: {
          init: (_, state) => find(state.doc),
          apply: (tr, old) => (tr.docChanged ? find(tr.doc) : old),
        },
        props: { decorations: state => plugin.getState(state) },
      });
      return [plugin];
    },
  });
};

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  className?: string;
  minHeightClass?: string;
  /** Text to mark (e.g. `{{company}}` placeholders); read once, when the editor is made. */
  highlight?: RegExp;
  /** Extra controls at the right end of the toolbar. */
  toolbarEnd?: ReactNode;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

const ToolbarButton = ({ active, disabled, onClick, icon, label }: ToolbarButtonProps) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={disabled}
    onMouseDown={e => e.preventDefault()}
    onClick={onClick}
    className={clsx(
      'inline-flex size-7 items-center justify-center rounded-md text-(--palette-gray-500) transition-colors hover:bg-(--palette-line) hover:text-(--palette-ink) disabled:pointer-events-none disabled:opacity-40',
      active &&
        'bg-primary/10 text-(--palette-primary-text) hover:bg-primary/15 hover:text-(--palette-primary-text)',
    )}
  >
    <Icon name={icon} style="solid" className="size-3.5" />
  </button>
);

const RichTextEditor = ({
  value,
  onChange,
  onBlur,
  className,
  minHeightClass = 'min-h-[12rem]',
  highlight,
  toolbarEnd,
}: RichTextEditorProps) => {
  // The extensions are read once by useEditor; the pattern is fixed for the editor's life.
  const extensions = useMemo(
    () => [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      ...(highlight
        ? [
            patternHighlight(
              highlight,
              'rounded border border-dashed border-amber-500 bg-amber-50 px-1 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
            ),
          ]
        : []),
    ],
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const editor = useEditor({
    extensions,
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onBlur: () => onBlur?.(),
  });

  // Reset editor content when the field's value changes from outside (e.g. modal
  // reopened with new defaultValues) — mirrors a controlled-input reset.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={clsx(
        'rounded-lg border border-(--palette-input-edge) bg-(--form-input-bg) transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-(--palette-line) px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          icon="bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          icon="italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <div className="mx-1 h-4 w-px bg-(--palette-line)" />
        <ToolbarButton
          label="Bullet list"
          icon="list-ul"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Numbered list"
          icon="list-ol"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <div className="mx-1 h-4 w-px bg-(--palette-line)" />
        <ToolbarButton
          label="Insert table"
          icon="table"
          disabled={editor.isActive('table')}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        />
        {toolbarEnd && <div className="ml-auto flex items-center gap-1">{toolbarEnd}</div>}
      </div>
      <EditorContent
        editor={editor}
        className={clsx(
          'flex max-h-96 flex-col overflow-y-auto px-3.5 py-2.5 text-sm leading-relaxed text-(--palette-ink) [&_.ProseMirror]:flex-1',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_table]:my-2 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse',
          '[&_td]:border [&_td]:border-(--palette-line-strong) [&_td]:p-1.5 [&_td]:break-words [&_th]:border [&_th]:border-(--palette-line-strong) [&_th]:bg-(--palette-surface-3) [&_th]:p-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:break-words',
          minHeightClass,
        )}
      />
    </div>
  );
};

export default RichTextEditor;
