"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";

// TinyMCE editor generates dynamic IDs and uses browser APIs.
// Load it only on the client to avoid SSR hydration mismatches.
const Editor = dynamic(
  async () => {
    const mod = await import("@tinymce/tinymce-react");
    return mod.Editor;
  },
  { ssr: false },
);

interface RichTextEditorProps {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

const DEFAULT_EDITOR_HEIGHT = 220;
const TINYMCE_API_KEY =
  process.env.NEXT_PUBLIC_TINYMCE_API_KEY ?? "";

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  height = DEFAULT_EDITOR_HEIGHT,
}: RichTextEditorProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="mb-1 block text-md font-medium text-zinc-700">
          {label}
        </label>
      )}
      <div className="overflow-hidden rounded-md border border-zinc-300 bg-white text-sm shadow-sm">
        <Editor
          apiKey={TINYMCE_API_KEY}
          value={value}
          init={{
            menubar: false,
            placeholder,
            height,
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
              "bullist numlist outdent indent | fontsize fontfamily | " +
              "lineheight | removeformat",
            font_family_formats:
              
              "Playfair Display='Playfair Display',serif;" +
              "Roboto=Roboto,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" +
              "Bricolage Grotesque='Bricolage Grotesque',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;",
            font_size_formats:
              "10px 12px 14px 16px 18px 20px 24px 28px 32px 36px 42px 48px",
            line_height_formats: "1 1.15 1.3 1.5 1.75 2 2.5 3",
            content_style: `
              @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Roboto:wght@400;500;700&family=Bricolage+Grotesque:wght@400;600&display=swap');

              body {
                font-family: Roboto, system-ui, sans-serif;
                font-size: 14px;
                line-height: 1.2;
              }

              h1, h2, h3, h4, h5, h6 {
                font-family: 'Playfair Display', serif;
              }
            `,
          }}
          onEditorChange={(content: string) => onChange(content)}
        />
      </div>
    </div>
  );
}

