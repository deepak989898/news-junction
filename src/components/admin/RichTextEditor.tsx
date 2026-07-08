"use client";

import { useRef, useCallback } from "react";
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Underline } from "lucide-react";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export default function RichTextEditor({ label, value, onChange, rows = 10 }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const addLink = () => {
    const url = prompt("Enter URL:");
    if (url) exec("createLink", url);
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="overflow-hidden rounded-lg border border-gray-300">
        <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2">
          {[
            { icon: Bold, cmd: "bold", title: "Bold" },
            { icon: Italic, cmd: "italic", title: "Italic" },
            { icon: Underline, cmd: "underline", title: "Underline" },
          ].map(({ icon: Icon, cmd, title }) => (
            <button
              key={cmd}
              type="button"
              title={title}
              onClick={() => exec(cmd)}
              className="rounded p-1.5 text-gray-600 hover:bg-white hover:text-[#1a2b4c]"
            >
              <Icon size={16} />
            </button>
          ))}
          <button
            type="button"
            title="Bullet List"
            onClick={() => exec("insertUnorderedList")}
            className="rounded p-1.5 text-gray-600 hover:bg-white hover:text-[#1a2b4c]"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            title="Numbered List"
            onClick={() => exec("insertOrderedList")}
            className="rounded p-1.5 text-gray-600 hover:bg-white hover:text-[#1a2b4c]"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            title="Link"
            onClick={addLink}
            className="rounded p-1.5 text-gray-600 hover:bg-white hover:text-[#1a2b4c]"
          >
            <LinkIcon size={16} />
          </button>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: value }}
          className="min-h-[120px] px-4 py-3 text-sm leading-relaxed focus:outline-none"
          style={{ minHeight: `${rows * 1.5}rem` }}
        />
      </div>
    </div>
  );
}
