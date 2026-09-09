import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
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

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  className?: string;
  minHeightClass?: string;
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
      'inline-flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-40',
      active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
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
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
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
        'rounded-lg border border-gray-200 bg-gray-50/60 transition-colors focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20',
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-gray-200 px-2 py-1.5">
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
        <div className="mx-1 h-4 w-px bg-gray-200" />
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
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <ToolbarButton
          label="Insert table"
          icon="table"
          disabled={editor.isActive('table')}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        />
      </div>
      <EditorContent
        editor={editor}
        className={clsx(
          'max-h-96 overflow-y-auto px-3.5 py-2.5 text-sm leading-relaxed text-gray-900 [&_.ProseMirror]:outline-none',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_table]:my-2 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse',
          '[&_td]:border [&_td]:border-gray-300 [&_td]:p-1.5 [&_td]:break-words [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:p-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:break-words',
          minHeightClass,
        )}
      />
    </div>
  );
};

export default RichTextEditor;
