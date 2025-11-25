'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  height = '150px',
}) => {
  const [isMounted, setIsMounted] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3]
        },
      }),
      Underline,
      Subscript,
      Superscript,
      Placeholder.configure({
        placeholder
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[' + height + '] p-4'
      }
    }
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!isMounted) {
    return (
      <div className="border-2 border-border-light dark:border-border-dark rounded-lg p-4" style={{ minHeight: height }}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    icon, 
    title 
  }: { 
    onClick: () => void; 
    isActive: boolean; 
    icon: string; 
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-lg transition-all hover:scale-105 active:scale-95 ${
        isActive 
          ? 'bg-primary text-white shadow-md' 
          : 'hover:bg-background-light dark:hover:bg-background-dark text-text-light-secondary dark:text-text-dark-secondary'
      }`}
      title={title}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
    </button>
  );

  return (
    <div className="border-2 border-border-light dark:border-border-dark rounded-lg overflow-hidden bg-surface-light dark:bg-surface-dark">
      {/* Toolbar */}
      <div className="bg-background-light dark:bg-background-dark border-b border-border-light dark:border-border-dark p-2 flex flex-wrap gap-1">
        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon="format_bold"
            title="Negrito (Ctrl+B)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon="format_italic"
            title="Itálico (Ctrl+I)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            icon="format_underlined"
            title="Sublinhado (Ctrl+U)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            icon="strikethrough_s"
            title="Tachado"
          />
        </div>

        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon="title"
            title="Título (H2)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            icon="format_size"
            title="Subtítulo (H3)"
          />
        </div>

        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon="format_list_bulleted"
            title="Lista com marcadores"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon="format_list_numbered"
            title="Lista numerada"
          />
        </div>

        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            isActive={editor.isActive('subscript')}
            icon="subscript"
            title="Subscrito"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            isActive={editor.isActive('superscript')}
            icon="superscript"
            title="Sobrescrito"
          />
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default SimpleRichTextEditor;
