"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import { Bold, Italic, List, ListOrdered, Heading2, Link2 } from "lucide-react";
import type { ReactNode } from "react";

const extensions = [
  StarterKit.configure({ link: false }),
  TiptapLink.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } }),
];

function TB({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: ReactNode; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition cursor-pointer ${active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-200"}`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange }: { value?: JSONContent | null; onChange: (json: JSONContent) => void }) {
  const editor = useEditor({
    extensions,
    content: value ?? "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: { attributes: { class: "rte-content focus:outline-none min-h-[140px] px-3 py-2" } },
  });

  if (!editor) return null;

  const setLink = () => {
    const prev = (editor.getAttributes("link").href as string) || "";
    const url = window.prompt("Adresse du lien (URL) :", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1">
        <TB title="Gras" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><Bold className="w-4 h-4" /></TB>
        <TB title="Italique" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><Italic className="w-4 h-4" /></TB>
        <TB title="Titre" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}><Heading2 className="w-4 h-4" /></TB>
        <TB title="Liste à puces" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}><List className="w-4 h-4" /></TB>
        <TB title="Liste numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}><ListOrdered className="w-4 h-4" /></TB>
        <TB title="Lien" onClick={setLink} active={editor.isActive("link")}><Link2 className="w-4 h-4" /></TB>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export function RichTextView({ value }: { value?: JSONContent | null }) {
  const editor = useEditor({
    extensions,
    content: value ?? "",
    editable: false,
    immediatelyRender: false,
  });
  if (!editor) return null;
  return <EditorContent editor={editor} className="rte-content" />;
}
