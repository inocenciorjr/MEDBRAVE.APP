'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
  onImageInsert?: (file: File) => Promise<string>;
  editorRef?: React.MutableRefObject<Editor | null>;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite aqui...',
  height = '200px',
  onImageInsert,
  editorRef
}) => {
  const [isMounted, setIsMounted] = useState(false);

  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        // Desabilitar extensões que vamos adicionar manualmente
        link: false,
      }),
      Underline,
      Subscript,
      Superscript,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify']
      }),
      Placeholder.configure({
        placeholder
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline'
        }
      }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg'
        }
      })
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

  useEffect(() => {
    if (editor && editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  if (!isMounted) {
    return (
      <div className="border-2 border-border-light dark:border-border-dark rounded-lg p-8 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
          <span className="text-text-light-secondary dark:text-text-dark-secondary font-medium">Carregando editor...</span>
        </div>
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    icon: string;
    title: string;
  }> = ({ onClick, isActive, icon, title }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`group relative p-2.5 rounded-lg transition-all ${
        isActive
          ? 'bg-primary text-white shadow-sm'
          : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-text-light-primary dark:hover:text-text-dark-primary'
      }`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {/* Tooltip */}
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                     bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                     text-xs font-semibold rounded-lg whitespace-nowrap 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                     pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300">
        {title}
        {/* Arrow */}
        <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                       w-0 h-0 border-l-[6px] border-l-transparent 
                       border-r-[6px] border-r-transparent 
                       border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
      </span>
    </button>
  );

  return (
    <div className="rich-text-editor border-2 border-border-light dark:border-border-dark rounded-lg overflow-visible">
      {/* Toolbar */}
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-border-light dark:border-border-dark p-3 flex flex-wrap gap-2 overflow-visible relative">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-3">
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

        {/* Headings */}
        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            icon="title"
            title="Título Grande (H1)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon="title"
            title="Título Médio (H2)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            icon="title"
            title="Título Pequeno (H3)"
          />
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon="format_list_bulleted"
            title="Lista com Marcadores"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon="format_list_numbered"
            title="Lista Numerada"
          />
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            icon="format_align_left"
            title="Alinhar à Esquerda"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            icon="format_align_center"
            title="Centralizar Texto"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            icon="format_align_right"
            title="Alinhar à Direita"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            icon="format_align_justify"
            title="Justificar Texto"
          />
        </div>

        {/* Script */}
        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            isActive={editor.isActive('subscript')}
            icon="subscript"
            title="Subscrito (H₂O)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            isActive={editor.isActive('superscript')}
            icon="superscript"
            title="Sobrescrito (X²)"
          />
        </div>

        {/* Blocks */}
        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-3">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            icon="format_quote"
            title="Citação em Bloco"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            icon="code"
            title="Bloco de Código"
          />
        </div>

        {/* Image */}
        <div className="flex gap-1 border-r border-border-light dark:border-border-dark pr-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file && onImageInsert) {
                  try {
                    const url = await onImageInsert(file);
                    editor.chain().focus().setImage({ src: url }).run();
                  } catch (error) {
                    console.error('Error uploading image:', error);
                  }
                }
                e.target.value = ''; // Reset input
              }}
            />
            <div
              className="group relative p-2.5 rounded-lg transition-all text-text-light-secondary dark:text-text-dark-secondary hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-text-light-primary dark:hover:text-text-dark-primary"
              title="Inserir Imagem"
            >
              <span className="material-symbols-outlined text-lg">image</span>
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                           bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 
                           text-xs font-semibold rounded-lg whitespace-nowrap 
                           opacity-0 group-hover:opacity-100 transition-opacity duration-200 
                           pointer-events-none z-[9999] shadow-xl border-2 border-slate-700 dark:border-slate-300">
                Inserir Imagem
                {/* Arrow */}
                <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[2px]
                             w-0 h-0 border-l-[6px] border-l-transparent 
                             border-r-[6px] border-r-transparent 
                             border-t-[6px] border-t-slate-900 dark:border-t-slate-100"></span>
              </span>
            </div>
          </label>
        </div>

        {/* Other */}
        <div className="flex gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            icon="horizontal_rule"
            title="Linha Horizontal"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            icon="undo"
            title="Desfazer (Ctrl+Z)"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            icon="redo"
            title="Refazer (Ctrl+Y)"
          />
        </div>
      </div>

      {/* Editor Content */}
      <div 
        className="bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary overflow-y-auto"
        style={{ minHeight: height, maxHeight: '600px' }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;
