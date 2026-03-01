function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sanitizeTexInput(s) {
  return String(s || "");
}

// If user stored question beginning with \subsection{...}, remove it,
// because we generate subsection ourselves from task.points.
function stripLeadingSubsection(s) {
  const str = String(s || "");
  // removes: \subsection{...} or \subsection*{...} plus trailing whitespace/newlines
  return str.replace(/^\\subsection\*?\{[^}]*\}\s*/m, "");
}

// If user stored solution already wrapped with solution env, unwrap it,
// because we wrap once in the builder.
function unwrapSolutionEnv(s) {
  const str = String(s || "");
  const m = str.match(/\\begin\{solution\}([\s\S]*?)\\end\{solution\}/m);
  return m ? m[1].trim() : str;
}

function buildDocumentPreamble() {
  return String.raw`\documentclass[a4paper,12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[ngerman]{babel}
\usepackage{amsmath, amssymb}
\usepackage{graphicx}
\usepackage{subcaption}
\usepackage{hyperref}
\usepackage{geometry}
\usepackage{array}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{listings}
\usepackage{tikz}
\usetikzlibrary{decorations.pathreplacing,arrows.meta,positioning}
\usepackage{tabularx}
\usepackage[most]{tcolorbox}
\usepackage{comment}
\usepackage{fancyhdr}

\geometry{a4paper, left=2cm, right=2cm, top=2cm, bottom=2cm}
\def \runninghead {Exam}

\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\footrulewidth}{0.4pt}
\pagestyle{fancy}
\lhead{Matrikelnr.:}
\chead{}
\rhead{}
\lfoot{\runninghead}
\cfoot{}
\rfoot{Seite \thepage}

\renewcommand{\thesubsection}{\alph{subsection})}
\titleformat{\subsection}[runin]{\normalfont\bfseries}{\thesubsection}{1em}{}
\setlength{\parindent}{0pt}

\newif\ifshowsolutions
\showsolutionstrue
\ifshowsolutions
  \newtcolorbox{solution}{
    colback=red!80,
    colframe=red!90!black,
    fontupper=\color{white}\footnotesize,
    title=Solution,
    boxrule=0.8pt,
    arc=4pt,
    top=6pt,
    bottom=6pt,
    left=6pt,
    right=6pt
  }
\else
  \excludecomment{solution}
\fi
`;
}

function buildLatexFromDraft({ coverPageLatex, topics }) {
  const parts = [];
  parts.push(buildDocumentPreamble());
  parts.push(String.raw`\begin{document}`);

  // Cover page block (front page is per course)
  if (coverPageLatex && String(coverPageLatex).trim()) {
    parts.push(sanitizeTexInput(coverPageLatex));
  } else {
    // fallback if course has no cover page
    parts.push(String.raw`\section*{Exam}`);
    parts.push(String.raw`\newpage`);
  }

  // Ensure headers active after cover
  parts.push(String.raw`\thispagestyle{fancy}`);
  parts.push(String.raw`\setcounter{page}{1}`);

  for (let i = 0; i < (topics || []).length; i++) {
    const t = topics[i] || {};

    // Topic header: allow full LaTeX section or plain text
    const topicStr = String(t.topic || "").trim();
    const topicHeader = topicStr.startsWith("\\section")
      ? sanitizeTexInput(topicStr)
      : String.raw`\section{${sanitizeTexInput(topicStr)}}`;

    parts.push(topicHeader);

    if (t.description && String(t.description).trim()) {
      parts.push(sanitizeTexInput(t.description));
    }

    if (t.__descImgPath) {
      parts.push(String.raw`\begin{center}
\includegraphics[width=0.9\linewidth]{${t.__descImgPath}}
\end{center}`);
    }

    const tasks = Array.isArray(t.tasks) ? t.tasks : [];
    for (let j = 0; j < tasks.length; j++) {
      const task = tasks[j] || {};
      const pts = num(task.points);

      // We generate subsection from points. Strip any user-supplied \subsection{...} in question.
      parts.push(String.raw`\subsection{${pts}P}`);

      const questionBody = stripLeadingSubsection(task.question || "");
      if (String(questionBody).trim()) {
        parts.push(sanitizeTexInput(questionBody));
      }

      if (task.__qImgPath) {
        parts.push(String.raw`\begin{center}
\includegraphics[width=0.9\linewidth]{${task.__qImgPath}}
\end{center}`);
      }

      // Unwrap if user stored \begin{solution}...\end{solution}
      const solBody = unwrapSolutionEnv(task.solution || "");
      if (String(solBody).trim()) {
        parts.push(String.raw`\begin{solution}
${sanitizeTexInput(solBody)}
\end{solution}`);
      }
    }
  }

  parts.push(String.raw`\end{document}`);
  return parts.join("\n\n");
}

module.exports = { buildLatexFromDraft };
