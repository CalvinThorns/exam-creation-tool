import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

function registerLatex(monaco) {
  if (!monaco.languages.getLanguages().some((language) => language.id === "latex")) {
    monaco.languages.register({ id: "latex" });
  }

  monaco.languages.setMonarchTokensProvider("latex", {
    tokenizer: {
      root: [
        [/%.*$/, "comment"],
        [/\\[a-zA-Z@]+/, "keyword"],
        [/\$[^$]*\$/, "string"],
        [/\$\$/, "delimiter"],
        [/[{}[\]()]/, "delimiter"],
        [/&/, "delimiter"],
        [/[0-9]+/, "number"],
      ],
    },
  });

  monaco.languages.setLanguageConfiguration("latex", {
    comments: { lineComment: "%" },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "$", close: "$" },
    ],
  });
}

export function LatexEditor({
  value,
  onChange,
  onPaste,
  height = 180,
  placeholder = "Write LaTeX here...",
  className,
}) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !onPaste) return undefined;

    const domNode = editor.getDomNode();
    if (!domNode) return undefined;

    const handlePaste = (event) => {
      onPaste(event);
    };

    domNode.addEventListener("paste", handlePaste);
    return () => {
      domNode.removeEventListener("paste", handlePaste);
    };
  }, [onPaste]);

  return (
    <Box
      className={className}
      sx={{
        borderRadius: 1,
        overflow: "auto",
        border: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
        resize: "vertical",
        height,
        minHeight: 120,
      }}
    >
      <Editor
        height="100%"
        defaultLanguage="latex"
        value={value || ""}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
        onChange={(nextValue) => onChange?.(nextValue ?? "")}
        beforeMount={(monaco) => {
          registerLatex(monaco);

          monaco.editor.defineTheme("exam-light", {
            base: "vs",
            inherit: true,
            rules: [],
            colors: {
              "editor.background": "#ffffff",
              "editorLineNumber.foreground": "#94a3b8",
            },
          });

          monaco.editor.defineTheme("exam-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [],
            colors: {
              "editor.background": "#111827",
              "editor.foreground": "#e2e8f0",
              "editorLineNumber.foreground": "#64748b",
              "editorCursor.foreground": "#93c5fd",
              "editor.selectionBackground": alpha("#93c5fd", 0.28),
              "editor.inactiveSelectionBackground": alpha("#93c5fd", 0.16),
            },
          });
        }}
        placeholder={placeholder}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          lineNumbers: "off",
          overviewRulerBorder: false,
          renderLineHighlight: "none",
          tabSize: 2,
          formatOnPaste: false,
          formatOnType: false,
          automaticLayout: true,
          cursorBlinking: "smooth",
          padding: { top: 10, bottom: 10 },
          contextmenu: !onPaste,
        }}
        theme={isDarkMode ? "exam-dark" : "exam-light"}
      />
    </Box>
  );
}
