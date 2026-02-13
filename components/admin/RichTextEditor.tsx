"use client";

import type { ReactNode } from "react";
import { Editor } from "@tinymce/tinymce-react";

interface RichTextEditorProps {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="mb-1 block text-xs font-medium text-zinc-700">
          {label}
        </label>
      )}
      <div className="overflow-hidden rounded-md border border-zinc-300 bg-white text-sm shadow-sm">
        <Editor
          apiKey="43s55u248c5ldzl0sgw8qqoulxq2qwfmantt5ici03v6alvr"
          value={value}
          init={{
            menubar: false,
            placeholder,
            height: 220,
            resize: false,
            plugins: [
              "advlist",
              "autolink",
              "lists",
              "link",
              "charmap",
              "preview",
              "anchor",
              "searchreplace",
              "visualblocks",
              "code",
              "fullscreen",
              "insertdatetime",
              "media",
              "table",
              "help",
              "wordcount",
            ],
            toolbar:
              "undo redo | styles | bold italic underline forecolor backcolor | " +
              "alignleft aligncenter alignright alignjustify | " +
              "bullist numlist outdent indent | fontsizeselect fontfamily | " +
              "lineheight | removeformat",
            font_size_formats:
              "10px 12px 14px 16px 18px 20px 24px 28px 32px 36px",
            line_height_formats: "1 1.15 1.3 1.5 1.75 2 2.5 3",
            content_style:
              "body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:14px; }",
          }}
          onEditorChange={(content) => onChange(content)}
        />
      </div>
    </div>
  );
}



