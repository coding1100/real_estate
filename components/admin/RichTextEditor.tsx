"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Node } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Underline from "@tiptap/extension-underline";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Strike from "@tiptap/extension-strike";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import CodeBlock from "@tiptap/extension-code-block";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";

interface RichTextEditorProps {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

const DEFAULT_EDITOR_HEIGHT = 220;

// Paragraph node that allows a `style` attribute (for line-height, text-align, etc.)
const ParagraphWithStyle = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) {
            return {};
          }
          return { style: attributes.style };
        },
      },
    };
  },
});

// Custom block node rendered as <div class="tag"><span>...</span></div>
const TagBlock = Node.create({
  name: "tagBlock",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "div.tag" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = {
      ...(HTMLAttributes || {}),
      class: ["tag", (HTMLAttributes as any)?.class].filter(Boolean).join(" "),
    };
    // Wrap inner content in a single span inside the tag div:
    // <div class="tag"><span>...</span></div>
    return ["div", attrs, ["span", 0]];
  },
});

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "",
  height = DEFAULT_EDITOR_HEIGHT,
}: RichTextEditorProps) {
  const defaultRoboto =
    'Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const tagFontFamily =
    "Bricolage Grotesque, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const [currentFontFamily, setCurrentFontFamily] = useState(defaultRoboto);
  const [currentFontSize, setCurrentFontSize] = useState("14px");
  const [currentLineHeight, setCurrentLineHeight] = useState("1.5");
  const lastEmittedHtml = useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        paragraph: false, // we'll add our own paragraph with style support
        codeBlock: false, // we'll use separate CodeBlock extension
      }),
      ParagraphWithStyle,
      TagBlock,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      TextAlign.configure({
        // Align headings and individual paragraphs only (not whole blockquotes),
        // so each paragraph keeps its own alignment even inside a blockquote.
        types: ["heading", "paragraph"],
      }),
      Strike,
      Link.configure({
        autolink: true,
        openOnClick: false,
        linkOnPaste: true,
      }),
      Highlight,
      CodeBlock,
      HorizontalRule,
      Subscript,
      Superscript,
    ],
    content: value || "",
    immediatelyRender: false,
    onUpdate({ editor }) {
      // Normalize completely empty paragraphs to <p>&nbsp;</p>
      let html = editor.getHTML();
      html = html.replace(/<p>\s*<\/p>/g, "<p>&nbsp;</p>");

      // Normalize tag blocks so there is always exactly one <span> inside
      // <div class="tag">...</div>, even if pasted content had nested spans.
      // Example input:
      //   <div class="tag"><span><span ...>Text</span></span></div>
      // becomes:
      //   <div class="tag"><span ...>Text</span></div>
      html = html.replace(
        /<div class="tag">\s*<span>\s*<span([^>]*)>([\s\S]*?)<\/span>\s*<\/span>\s*<\/div>/gi,
        '<div class="tag"><span$1>$2</span></div>',
      );

      // Ensure every tag span carries the Bricolage Grotesque font-family,
      // so tag styling is consistent whether text was existing or newly typed.
      html = html.replace(
        /<div class="tag">\s*<span((?!font-family)[^>]*)>/gi,
        `<div class="tag"><span style="font-family: ${tagFontFamily};"$1>`,
      );

      lastEmittedHtml.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none p-3 min-h-[140px]",
        style: `font-family: ${defaultRoboto};`,
      },
      transformPastedHTML(html) {
        // Strip editor-specific attributes that can break editing behavior,
        // but keep normal inline styles so each element can carry its own
        // font, size, color, alignment, etc. onto the frontend.
        return html
          .replace(/\scontenteditable="[^"]*"/gi, "")
          .replace(/\scontenteditable='[^']*'/gi, "")
          .replace(/\sdata-[a-z0-9_-]+="[^"]*"/gi, "")
          .replace(/\sdata-[a-z0-9_-]+='[^']*'/gi, "");
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const updateFromSelection = () => {
      // Inline text styles (font family / size)
      const attrs = editor.getAttributes("textStyle") as {
        fontFamily?: string;
        fontSize?: string;
      };

      setCurrentFontFamily(attrs.fontFamily || defaultRoboto);
      setCurrentFontSize(attrs.fontSize || "14px");

      // Paragraph-level line-height, stored as inline style on <p>
      const paraAttrs = editor.getAttributes("paragraph") as {
        style?: string;
      };
      let lh = "1.5";
      if (paraAttrs.style) {
        const match = paraAttrs.style.match(/line-height:\s*([^;]+);?/i);
        if (match && match[1]) {
          lh = match[1].trim();
        }
      }
      setCurrentLineHeight(lh);
    };

    editor.on("selectionUpdate", updateFromSelection);
    editor.on("transaction", updateFromSelection);
    updateFromSelection();

    return () => {
      editor.off("selectionUpdate", updateFromSelection);
      editor.off("transaction", updateFromSelection);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    // Only update editor content when the external `value` prop changed
    // from outside the editor (e.g. server data load, reset), not when
    // the change was just emitted by this editor instance.
    if (value === lastEmittedHtml.current) {
      return;
    }
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [editor, value]);

  const resolvedHeight = height ?? DEFAULT_EDITOR_HEIGHT;

  return (
    <div className="space-y-1">
      {label && (
        <label className="mb-1 block text-md font-medium text-zinc-700">
          {label}
        </label>
      )}
      <div className="overflow-hidden rounded-md border border-zinc-300 bg-white text-sm shadow-sm">
        <div className="tiptap-toolbar flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5">
          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className="px-1.5 py-0.5 rounded text-zinc-700 hover:bg-zinc-200 disabled:opacity-40"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className="px-1.5 py-0.5 rounded text-zinc-700 hover:bg-zinc-200 disabled:opacity-40"
          >
            ↻
          </button>

          {/* Heading levels */}
          <select
            className="ml-1 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs text-zinc-700"
            value={
              editor?.isActive("heading", { level: 1 })
                ? "h1"
                : editor?.isActive("heading", { level: 2 })
                  ? "h2"
                  : editor?.isActive("heading", { level: 3 })
                    ? "h3"
                    : "p"
            }
            onChange={(e) => {
              const val = e.target.value;
              if (!editor) return;
              if (val === "p") {
                editor.chain().focus().setParagraph().run();
              } else {
                const level = Number(val.slice(1)) as 1 | 2 | 3;
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
          >
            <option value="p">Paragraph</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
          </select>

          {/* Basic marks */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`px-1.5 py-0.5 rounded ${
              editor?.isActive("bold")
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`px-1.5 py-0.5 rounded italic ${
              editor?.isActive("italic")
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            className={`px-1.5 py-0.5 rounded underline ${
              editor?.isActive("underline")
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            U
          </button>

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            className={`px-1.5 py-0.5 rounded line-through ${
              editor?.isActive("strike")
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            S
          </button>

          {/* Text color */}
          <input
            type="color"
            className="ml-1 h-5 w-5 cursor-pointer rounded border border-zinc-300 bg-white"
            value={
              (editor?.getAttributes("textStyle").color as string) || "#000000"
            }
            onChange={(e) =>
              editor
                ?.chain()
                .focus()
                .setColor(e.target.value)
                .run()
            }
          />

          {/* Highlight */}
          <button
            type="button"
            onClick={() =>
              editor?.chain().focus().toggleHighlight().run()
            }
            className={`px-1.5 py-0.5 rounded ${
              editor?.isActive("highlight")
                ? "bg-yellow-300 text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            HL
          </button>

          {/* Alignment */}
          <div className="ml-1 inline-flex rounded border border-zinc-300 bg-white">
            <button
              type="button"
              onClick={() =>
                editor?.chain().focus().setTextAlign("left").run()
              }
              className={`px-1.5 py-0.5 text-[10px] ${
                editor?.isActive({ textAlign: "left" })
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              L
            </button>
            <button
              type="button"
              onClick={() =>
                editor?.chain().focus().setTextAlign("center").run()
              }
              className={`px-1.5 py-0.5 text-[10px] ${
                editor?.isActive({ textAlign: "center" })
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              C
            </button>
            <button
              type="button"
              onClick={() =>
                editor?.chain().focus().setTextAlign("right").run()
              }
              className={`px-1.5 py-0.5 text-[10px] ${
                editor?.isActive({ textAlign: "right" })
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              R
            </button>
          </div>

          {/* Font family */}
          <select
            className="ml-1 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs text-zinc-700"
            value={currentFontFamily}
            onChange={(e) => {
              const val = e.target.value;
              if (!editor) return;
              if (val === "default") {
                editor.chain().focus().unsetFontFamily().run();
              } else {
                editor.chain().focus().setFontFamily(val).run();
              }
              setCurrentFontFamily(val);
            }}
          >
            <option value="default">Default font</option>
            <option value="Playfair Display, serif">Playfair Display</option>
            <option value='Roboto, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'>
              Roboto
            </option>
            <option value="Bricolage Grotesque, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
              Bricolage Grotesque
            </option>
            <option value='"Alegreya Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'>
              Alegreya Sans
            </option>
            <option value='"Poiret One", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'>
              Poiret One
            </option>
          </select>

          {/* Font size */}
          <select
            className="ml-1 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs text-zinc-700"
            value={currentFontSize}
            onChange={(e) => {
              const val = e.target.value;
              if (!editor) return;
              editor.chain().focus().setFontSize(val).run();
              setCurrentFontSize(val);
            }}
          >
            <option value="10px">10</option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
            <option value="28px">28</option>
            <option value="32px">32</option>
            <option value="36px">36</option>
            <option value="42px">42</option>
            <option value="48px">48</option>
          </select>

          {/* Line height */}
          <select
            className="ml-1 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs text-zinc-700"
            value={currentLineHeight}
            onChange={(e) => {
              const val = e.target.value;
              if (!editor) return;

              // Merge with existing paragraph style so we keep text-align, etc.
              const paraAttrs = editor.getAttributes("paragraph") as {
                style?: string;
              };
              let style = paraAttrs.style || "";

              // Remove any existing line-height from the style string
              style = style.replace(/line-height:\s*[^;]+;?/gi, "").trim();

              if (style && !style.endsWith(";")) {
                style += ";";
              }

              if (style) {
                style += " ";
              }

              style += `line-height: ${val};`;

              editor
                .chain()
                .focus()
                .setParagraph()
                .updateAttributes("paragraph", { style })
                .run();

              setCurrentLineHeight(val);
            }}
          >
            <option value="1">1</option>
            <option value="1.15">1.15</option>
            <option value="1.3">1.3</option>
            <option value="1.5">1.5</option>
            <option value="1.75">1.75</option>
            <option value="2">2</option>
            <option value="2.5">2.5</option>
            <option value="3">3</option>
          </select>

          {/* Lists */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`px-1.5 py-0.5 rounded ${
              editor?.isActive("bulletList")
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={`px-1.5 py-0.5 rounded ${
              editor?.isActive("orderedList")
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            1. List
          </button>

          {/* Indent / Outdent for list items */}
          <button
            type="button"
            onClick={() =>
              editor?.chain().focus().sinkListItem("listItem").run()
            }
            className="px-1.5 py-0.5 rounded text-zinc-700 hover:bg-zinc-200"
          >
            ➜
          </button>
          <button
            type="button"
            onClick={() =>
              editor?.chain().focus().liftListItem("listItem").run()
            }
            className="px-1.5 py-0.5 rounded text-zinc-700 hover:bg-zinc-200"
          >
            ⬅
          </button>

          {/* Block quote */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={`px-1.5 py-0.5 rounded ${
              editor?.isActive("blockquote")
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            “”
          </button>

          {/* Tag block: wrap selection in <div class="tag"> */}
          <button
            type="button"
            onClick={() => {
              if (!editor) return;
              // Avoid runtime error if for some reason the node is missing
              if (!editor.schema.nodes["tagBlock"]) return;
              const isActive = editor.isActive("tagBlock");
              const chain = editor.chain().focus();

              if (isActive) {
                // Just remove the tag block, leave font family as-is
                chain.toggleNode("tagBlock", "paragraph").run();
              } else {
                // When creating a tag, also apply the Bricolage Grotesque font
                // to the current selection / stored marks so existing or newly
                // typed text uses the correct font.
                chain
                  .toggleNode("tagBlock", "paragraph")
                  .setFontFamily(tagFontFamily)
                  .run();
                setCurrentFontFamily(tagFontFamily);
              }
            }}
            className={`px-1.5 py-0.5 rounded ${
              editor?.isActive("tagBlock")
                ? "bg-zinc-900 text-white"
                : "text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            Tag
          </button>

          {/* Clear formatting */}
          <button
            type="button"
            onClick={() =>
              editor
                ?.chain()
                .focus()
                .clearNodes()
                .unsetAllMarks()
                .run()
            }
            className="ml-1 px-1.5 py-0.5 rounded text-zinc-700 hover:bg-zinc-200"
          >
            Clear
          </button>
        </div>
        <div
          style={{ minHeight: resolvedHeight }}
          className="bg-white text-sm"
        >
          {editor && <EditorContent editor={editor} />}
          {!editor && (
            <div className="p-3 text-xs text-zinc-400">Loading editor…</div>
          )}
        </div>
      </div>
    </div>
  );
}


