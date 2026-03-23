import Editor from "@monaco-editor/react";
import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

function registerLatex(monaco) {
  // Register LaTeX language
  if (!monaco.languages.getLanguages().some((l) => l.id === "latex")) {
    monaco.languages.register({ id: "latex" });
  }

  // Basic tokenization for LaTeX (good enough for commands, braces, comments, math)
  monaco.languages.setMonarchTokensProvider("latex", {
    tokenizer: {
      root: [
        [/%.*$/, "comment"],
        [/\\[a-zA-Z@]+/, "keyword"],
        [/\$[^$]*\$/, "string"], // inline math
        [/\$\$/, "delimiter"],
        [/[{}[\]()]/, "delimiter"],
        [/&/, "delimiter"],
        [/[0-9]+/, "number"],
      ],
    },
  });

  // Optional: language config for brackets and auto closing
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
  height = 180,
  placeholder = "Write LaTeX here...",
  className,
}) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

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
        onChange={(v) => onChange?.(v ?? "")}
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
        }}
        theme={isDarkMode ? "exam-dark" : "exam-light"}
      />
    </Box>
  );
}
