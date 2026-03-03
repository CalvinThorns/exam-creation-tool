function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sanitizeTexInput(s) {
  return String(s || "");
}

function stripLeadingSubsection(s) {
  const str = String(s || "");
  return str.replace(/^\\subsection\*?\{[^}]*\}\s*/m, "");
}

function unwrapSolutionEnv(s) {
  const str = String(s || "");
  const m = str.match(/\\begin\{solution\}([\s\S]*?)\\end\{solution\}/m);
  return m ? m[1].trim() : str;
}

function buildDocumentPreamble({ showSolutions }) {
  const flag = showSolutions ? "\\showsolutionstrue" : "\\showsolutionsfalse";

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

% Column helpers (needed for your marks table)
\newcolumntype{C}[1]{>{\centering\arraybackslash}p{#1}}
\newcolumntype{L}[1]{>{\raggedright\arraybackslash}p{#1}}

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
${flag}

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

/**
 * Generates the dynamic marks table block for the cover page.
 * Uses topics[].points and fills Summe.
 */
function buildMarksTableLatex(topics) {
  const nTopics = Array.isArray(topics) ? topics.length : 0;
  const n = Math.max(1, nTopics);

  const headerNums = Array.from({ length: n }, (_, i) => String(i + 1));
  const points = (topics || []).map((t) => num(t?.points));
  while (points.length < n) points.push(0);

  const sum = points.reduce((a, b) => a + num(b), 0);

  const headerRow = `Aufgabe & ${headerNums.join(" & ")} & Summe \\\\`;
  const pointsRow = `Punkte & ${points.join(" & ")} & ${sum} \\\\`;
  const reachedRow = `Erreicht & ${Array(n).fill("").join(" & ")} & \\\\`;

  // widths:
  // - first column fixed
  // - sum column fixed (a bit wider)
  // - each task column = (linewidth - first - sum) / n
  const firstW = "2.0cm";
  const sumW = "2.5cm";

  const taskW = `\\dimexpr(\\linewidth-${firstW}-${sumW})/${n}\\relax`;

  const taskCols = Array(n).fill(`C{${taskW}}|`).join("");

  const colSpec = `|L{${firstW}}||${taskCols}C{${sumW}}|`;

  return String.raw`
    \vspace{0.5cm}

    {\renewcommand{\arraystretch}{1.2}
    \setlength{\tabcolsep}{6pt}
    \begin{tabular}{${colSpec}}
    \hline
    ${headerRow}
    \hline
    ${pointsRow}
    \hline
    ${reachedRow}
    \hline
    \end{tabular}
    }
  `;
}

/**
 * Replaces the marks table block inside course.coverPage.
 * This is robust for user-provided cover pages because it searches for a tabularx
 * that contains the key rows: Aufgabe, Punkte, Erreicht.
 */
function injectMarksTableAuto(coverPageLatex, topics) {
  const src = String(coverPageLatex || "");
  const replacement = buildMarksTableLatex(topics);

  // Find the tabularx that contains Aufgabe + Punkte + Erreicht.
  // Then optionally include the preceding \vspace{0.5cm}\hrule block if present.
  const re =
    /(?:\\vspace\{0\.5cm\}\s*\\hrule\s*)?\\begin\{tabularx\}\{\\linewidth\}\{[\s\S]*?\}[\s\S]*?Aufgabe[\s\S]*?Punkte[\s\S]*?Erreicht[\s\S]*?\\end\{tabularx\}/m;

  if (!re.test(src)) {
    // Fallback: replace the first tabularx on cover page (better than failing compile),
    // but only if there is at least one tabularx.
    const firstTabularx =
      /\\begin\{tabularx\}\{\\linewidth\}\{[\s\S]*?\\end\{tabularx\}/m;
    if (firstTabularx.test(src)) {
      return src.replace(firstTabularx, replacement);
    }

    // If there is no table at all, append it near the end (still usable).
    return src + "\n\n" + replacement + "\n";
  }

  return src.replace(re, replacement);
}

function buildLatexFromDraft({ coverPageLatex, topics, version }) {
  const v = String(version || "TEACHER").toUpperCase();
  const showSolutions = v !== "STUDENT";

  const parts = [];
  parts.push(buildDocumentPreamble({ showSolutions }));
  parts.push(String.raw`\begin{document}`);

  // cover page (and table injection) stays as you already have it
  if (coverPageLatex && String(coverPageLatex).trim()) {
    const filledCover = injectMarksTableAuto(coverPageLatex, topics);
    parts.push(sanitizeTexInput(filledCover));
  } else {
    parts.push(String.raw`\section*{Exam}`);
    parts.push(String.raw`\newpage`);
  }

  parts.push(String.raw`\thispagestyle{fancy}`);
  parts.push(String.raw`\setcounter{page}{1}`);

  // rest of your topic/task rendering stays the same
  // when STUDENT, the solution env is excluded automatically
  // when TEACHER, it is shown automatically

  for (let i = 0; i < (topics || []).length; i++) {
    const t = topics[i] || {};
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

module.exports = { buildLatexFromDraft };
