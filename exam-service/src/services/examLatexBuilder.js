function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const SOLUTION_SPACE_TO_PAGES = {
  "1/4 Page": 0.25,
  "1/2 Page": 0.5,
  "3/4 Page": 0.75,
  "1 Page": 1,
  "2 Pages": 2,
  "3 Pages": 3,
  "4 Pages": 4,
};
const DEFAULT_SOLUTION_SPACE = "1 Page";
const BASE_TEMPLATE_PLACEHOLDER = "{{EXAM_CONTENT}}";

function sanitizeTexInput(value) {
  return String(value || "");
}

function normalizeSolutionSpace(space) {
  const normalized = String(space || "").trim();
  if (
    Object.prototype.hasOwnProperty.call(SOLUTION_SPACE_TO_PAGES, normalized)
  ) {
    return normalized;
  }
  return DEFAULT_SOLUTION_SPACE;
}

function buildStudentAnswerSpaceLatex(space) {
  const normalized = normalizeSolutionSpace(space);
  const pages = SOLUTION_SPACE_TO_PAGES[normalized];

  if (pages === 1) {
    return String.raw`\vspace*{\fill}`;
  }

  if (Number.isInteger(pages) && pages >= 2) {
    const blocks = [String.raw`\vspace*{\fill}`];
    for (let index = 1; index < pages; index += 1) {
      blocks.push(String.raw`\newpage
\null`);
    }
    return blocks.join("\n");
  }

  return `\\vspace*{${pages}\\textheight}`;
}

function stripLeadingSubsection(value) {
  const source = String(value || "");
  return source.replace(/^\\subsection\*?\{[^}]*\}\s*/m, "");
}

function unwrapSolutionEnv(value) {
  const source = String(value || "");
  const match = source.match(/\\begin\{solution\}([\s\S]*?)\\end\{solution\}/m);
  return match ? match[1].trim() : source;
}

function withShowSolutionsFlag(template, showSolutions) {
  const source = String(template || "");
  const desired = showSolutions
    ? "\\showsolutionstrue"
    : "\\showsolutionsfalse";

  if (/\\showsolutions(?:true|false)/.test(source)) {
    return source.replace(/\\showsolutions(?:true|false)/, desired);
  }

  if (/\\newif\\ifshowsolutions/.test(source)) {
    return source.replace(
      /\\newif\\ifshowsolutions/,
      `\\newif\\ifshowsolutions\n${desired}`,
    );
  }

  return source;
}

function withRunningHeadValue(source, runningHead) {
  const nextRunningHead = String(runningHead || "");
  if (/\\def\s*\\runninghead\s*\{[^}]*\}/.test(source)) {
    return source.replace(
      /\\def\s*\\runninghead\s*\{[^}]*\}/,
      `\\def \\runninghead {${nextRunningHead}}`,
    );
  }
  return source;
}

function extractDocumentBody(source) {
  const latex = String(source || "").trim();
  const match = latex.match(
    /\\begin\{document\}([\s\S]*?)\\end\{document\}/i,
  );
  return match ? match[1].trim() : latex;
}

function stripSolutionEnvironments(source) {
  return String(source || "")
    .replace(/\\begin\{solution\}[\s\S]*?\\end\{solution\}\s*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildMarksTableLatex(topics) {
  const topicCount = Array.isArray(topics) ? topics.length : 0;
  const columnCount = Math.max(1, topicCount);
  const headerNumbers = Array.from({ length: columnCount }, (_, index) =>
    String(index + 1),
  );
  const points = (topics || []).map((topic) => num(topic?.points));
  while (points.length < columnCount) points.push(0);
  const sum = points.reduce((acc, value) => acc + num(value), 0);

  const headerRow = `Aufgabe & ${headerNumbers.join(" & ")} & Summe \\\\`;
  const pointsRow = `Punkte & ${points.join(" & ")} & ${sum} \\\\`;
  const reachedRow = `Erreicht & ${Array(columnCount).fill("").join(" & ")} & \\\\`;

  const firstWidth = "2.0cm";
  const sumWidth = "2.5cm";
  const tableFont =
    columnCount >= 12 ? "\\scriptsize" : columnCount >= 9 ? "\\footnotesize" : "";
  const tabColSep = columnCount >= 12 ? "2pt" : columnCount >= 9 ? "3pt" : "4pt";
  const arrayStretch = columnCount >= 12 ? "1.1" : "1.2";
  const taskColumns = `*{${columnCount}}{>{\\centering\\arraybackslash}X|}`;
  const columnSpec = `|L{${firstWidth}}||${taskColumns}C{${sumWidth}}|`;

  return String.raw`
\vspace{0.5cm}

{${tableFont}
\renewcommand{\arraystretch}{${arrayStretch}}
\setlength{\tabcolsep}{${tabColSep}}
\begin{tabularx}{\linewidth}{${columnSpec}}
\hline
${headerRow}
\hline
${pointsRow}
\hline
${reachedRow}
\hline
\end{tabularx}
}
`;
}

function injectMarksTableAuto(coverPageLatex, topics) {
  const source = String(coverPageLatex || "");
  const replacement = buildMarksTableLatex(topics);
  const tableRegex =
    /(?:\\vspace\{0\.5cm\}\s*\\hrule\s*)?\\begin\{tabularx\}\{\\linewidth\}\{[\s\S]*?\}[\s\S]*?Aufgabe[\s\S]*?Punkte[\s\S]*?Erreicht[\s\S]*?\\end\{tabularx\}/m;

  if (!tableRegex.test(source)) {
    const firstTabularx =
      /\\begin\{tabularx\}\{\\linewidth\}\{[\s\S]*?\\end\{tabularx\}/m;
    if (firstTabularx.test(source)) {
      return source.replace(firstTabularx, replacement);
    }
    return `${source}\n\n${replacement}\n`;
  }

  return source.replace(tableRegex, replacement);
}

function buildFallbackTopicBody(topic, isStudentVersion) {
  const parts = [];
  const topicTitle = String(topic?.topic || "").trim();
  const topicPoints = num(topic?.points);

  parts.push(`\\section{${topicTitle} (${topicPoints}P)}`);

  if (topic?.description && String(topic.description).trim()) {
    parts.push(sanitizeTexInput(topic.description));
  }

  if (topic.__descImgPath) {
    parts.push(String.raw`\begin{center}
\includegraphics[width=0.9\linewidth]{${topic.__descImgPath}}
\end{center}`);
  }

  const tasks = Array.isArray(topic?.tasks) ? topic.tasks : [];
  tasks.forEach((task) => {
    const points = num(task?.points);
    parts.push(`\\subsection{${points}P}`);

    const questionBody = stripLeadingSubsection(task?.question || "");
    if (String(questionBody).trim()) {
      parts.push(sanitizeTexInput(questionBody));
    }

    if (task.__qImgPath) {
      parts.push(String.raw`\begin{center}
\includegraphics[width=0.9\linewidth]{${task.__qImgPath}}
\end{center}`);
    }

    const solutionBody = unwrapSolutionEnv(task?.solution || "");
    if (String(solutionBody).trim()) {
      parts.push(String.raw`\begin{solution}
${sanitizeTexInput(solutionBody)}
\end{solution}`);
    }

    if (isStudentVersion) {
      parts.push(buildStudentAnswerSpaceLatex(task?.solutionSpace));
    }
  });

  return parts.filter(Boolean).join("\n\n").trim();
}

function buildTopicBody(topic, isStudentVersion) {
  const rawTopicLatex = String(topic?.full_tex_code || "").trim();
  if (!rawTopicLatex) {
    return buildFallbackTopicBody(topic, isStudentVersion);
  }

  const topicTitle = String(topic?.topic || "").trim();
  const topicPoints = num(topic?.points);
  const heading = `\\section{${topicTitle} (${topicPoints}P)}`;

  let body = extractDocumentBody(rawTopicLatex);
  if (/\\section\*?\{[^}]*\}(?:\s*\([^)]*\))?/.test(body)) {
    body = body.replace(
      /\\section\*?\{[^}]*\}(?:\s*\([^)]*\))?/,
      heading,
    );
  } else {
    body = `${heading}\n\n${body}`.trim();
  }

  if (isStudentVersion) {
    body = stripSolutionEnvironments(body);
  }

  return body.trim();
}

function buildLatexFromDraft({
  coverPageLatex,
  topics,
  version,
  baseTemplate,
  courseTitle,
}) {
  const normalizedVersion = String(version || "TEACHER").toUpperCase();
  const showSolutions = normalizedVersion !== "STUDENT";
  const isStudentVersion = normalizedVersion === "STUDENT";
  const template = String(baseTemplate || "");

  if (!template.includes(BASE_TEMPLATE_PLACEHOLDER)) {
    throw new Error(
      `Base LaTeX template must contain placeholder ${BASE_TEMPLATE_PLACEHOLDER}`,
    );
  }

  const parts = [];

  if (coverPageLatex && String(coverPageLatex).trim()) {
    let coverBody = injectMarksTableAuto(coverPageLatex, topics);
    coverBody = extractDocumentBody(coverBody);
    coverBody = withRunningHeadValue(coverBody, courseTitle || "");
    parts.push(sanitizeTexInput(coverBody));
  }

  parts.push(String.raw`\thispagestyle{fancy}`);
  parts.push(String.raw`\setcounter{page}{1}`);

  (topics || []).forEach((topic, index) => {
    if (index > 0) {
      parts.push(String.raw`\newpage`);
    }
    parts.push(buildTopicBody(topic, isStudentVersion));
  });

  const body = parts.filter(Boolean).join("\n\n");
  const templateWithFlag = withShowSolutionsFlag(template, showSolutions);
  const templateWithRunningHead = withRunningHeadValue(
    templateWithFlag,
    courseTitle || "",
  );

  return templateWithRunningHead.replace(BASE_TEMPLATE_PLACEHOLDER, body);
}

module.exports = {
  buildLatexFromDraft,
};
