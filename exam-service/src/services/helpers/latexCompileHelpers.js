function hasLatexErrors(compile, numOrZero) {
  const stats = compile?.stats || {};
  const latexmkErrors = numOrZero(stats["latexmk-errors"]);
  const runsWithErrors = numOrZero(stats["latex-runs-with-errors"]);
  return (
    compile?.status !== "success" || latexmkErrors > 0 || runsWithErrors > 0
  );
}

function pickOutputFile(outputFiles, type, ext) {
  const files = outputFiles || [];
  const byType = files.find((f) => f && f.type === type && f.url);
  if (byType) return byType;

  if (ext) {
    const byExt = files.find(
      (f) =>
        f &&
        f.url &&
        typeof f.path === "string" &&
        f.path.toLowerCase().endsWith(ext.toLowerCase()),
    );
    if (byExt) return byExt;
  }

  return null;
}

async function downloadTextFileIfAny(client, file) {
  if (!file?.url) return null;
  const buf = await client.downloadAsBuffer(file.url);
  return buf.toString("utf8");
}

function parseLatexErrorsFromLog(
  logText,
  { maxErrors = 200, maxSnippet = 600 } = {},
) {
  if (!logText) return [];

  const lines = logText.split(/\r?\n/);
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.startsWith("!")) continue;

    const message = line.replace(/^!\s*/, "").trim();

    let texLine = null;
    const snippetLines = [line];

    for (let j = i + 1; j < lines.length && j < i + 40; j++) {
      const lj = lines[j];
      snippetLines.push(lj);

      const m = lj.match(/^l\.(\d+)\s*(.*)$/);
      if (m && texLine === null) texLine = Number(m[1]);

      if (j > i + 2 && lj.trim() === "") break;
      if (j > i && lines[j + 1] && lines[j + 1].startsWith("!")) break;
    }

    const snippet = snippetLines.join("\n").slice(0, maxSnippet);

    errors.push({
      message,
      line: texLine,
      snippet,
    });

    if (errors.length >= maxErrors) break;
  }

  const seen = new Set();
  return errors.filter((e) => {
    const key = `${e.message}@@${e.line ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractWarningsFromLog(logText, { maxWarnings = 200 } = {}) {
  if (!logText) return [];
  const lines = logText.split(/\r?\n/);

  const warnings = [];
  const re = /^(LaTeX|Package|Class)\s+(.+?)\s+Warning:\s+(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;

    const where = m[1];
    const source = m[2];
    const message = m[3];

    warnings.push({ where, source, message });
    if (warnings.length >= maxWarnings) break;
  }

  return warnings;
}

async function buildCompileDiagnostics({
  compile,
  client,
  numOrZero,
  maxErrors = 200,
  maxWarnings = 200,
  maxSnippet = 800,
} = {}) {
  const logFile = pickOutputFile(compile?.outputFiles, "log", ".log");
  const stdoutFile = pickOutputFile(compile?.outputFiles, "stdout", ".stdout");
  const stderrFile = pickOutputFile(compile?.outputFiles, "stderr", ".stderr");

  let logText = null;
  let stdoutText = null;
  let stderrText = null;

  try {
    logText = await downloadTextFileIfAny(client, logFile);
  } catch {}
  try {
    stdoutText = await downloadTextFileIfAny(client, stdoutFile);
  } catch {}
  try {
    stderrText = await downloadTextFileIfAny(client, stderrFile);
  } catch {}

  const parsedErrors = parseLatexErrorsFromLog(logText, {
    maxErrors,
    maxSnippet,
  });

  const parsedWarnings = extractWarningsFromLog(logText, {
    maxWarnings,
  });

  const compileHasErrors = hasLatexErrors(compile, numOrZero);

  const errors = [...parsedErrors];
  if (compileHasErrors && errors.length === 0) {
    errors.push({
      message: "Compilation reported errors. Check compiler log for details.",
      line: null,
      snippet: null,
    });
  }

  const errorCount = errors.length;
  const warningCount = parsedWarnings.length;

  const outcome =
    errorCount > 0
      ? "success_with_errors"
      : warningCount > 0
        ? "success_with_warnings"
        : "success";

  return {
    outcome,
    clsiStatus: compile?.status || null,
    buildId: compile?.buildId || null,
    stats: compile?.stats || {},
    timings: compile?.timings || {},
    errorCount,
    warningCount,
    errors,
    warnings: parsedWarnings,
    log: logText ? logText.slice(0, 20000) : null,
    stdout: stdoutText ? stdoutText.slice(0, 20000) : null,
    stderr: stderrText ? stderrText.slice(0, 20000) : null,
  };
}

module.exports = {
  hasLatexErrors,
  pickOutputFile,
  downloadTextFileIfAny,
  parseLatexErrorsFromLog,
  extractWarningsFromLog,
  buildCompileDiagnostics,
};
