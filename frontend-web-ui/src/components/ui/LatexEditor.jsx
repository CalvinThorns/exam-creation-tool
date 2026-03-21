import Editor from "@monaco-editor/react";
import { Box } from "@mui/material";

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
  return (
    <Box
      className={className}
      sx={{
        borderRadius: 1,
        overflow: "auto",
        border: "1px solid #d0d0d0",
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
        beforeMount={(monaco) => registerLatex(monaco)}
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
          padding: { top: 10, bottom: 10 },
        }}
        theme="vs"
      />
    </Box>
  );
}
