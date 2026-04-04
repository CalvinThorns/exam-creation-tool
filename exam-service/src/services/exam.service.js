const path = require("path");
const fs = require("fs").promises;
const { Topic } = require("../models/topic.model");
const { createClsiClient } = require("./clsiClient");
const { buildLatexFromDraft } = require("./examLatexBuilder");
const { logger } = require("../middlewares/logger");
const { Course } = require("../models/course.model");
const { buildClsiImageResourcesFromDraftTopics } = require("./draftAssets");
const {
  badRequest,
  notFound,
  isValidObjectId,
  randomProjectId,
  safeFilename,
  numOrZero,
  sumTopicPoints,
} = require("./helpers/examServiceCommon");
const {
  snapshotFromTopicDoc,
  topicSignature,
  loadVariantsByTopicNames,
  pickBestCombination,
  shuffleArray,
  validateDraftTopicsShape,
} = require("./helpers/examDraftHelpers");
const {
  hasLatexErrors,
  pickOutputFile,
  downloadTextFileIfAny,
  parseLatexErrorsFromLog,
  extractWarningsFromLog,
  buildCompileDiagnostics,
} = require("./helpers/latexCompileHelpers");
const { normalizePagination, buildMeta } = require("../utils/pagination");
const { parseFilters, parseSort } = require("../utils/query");

const BASE_TEMPLATE_PLACEHOLDER = "{{EXAM_CONTENT}}";
const BASE_TEMPLATE_PATH = String(
  process.env.EXAM_BASE_LATEX_TEMPLATE_PATH ||
    path.resolve(__dirname, "..", "templates", "base-exam-wrapper.tex"),
).trim();

const DEFAULT_BASE_TEMPLATE = String.raw`\documentclass[a4paper,12pt]{article}
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
\showsolutionsfalse

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

\begin{document}
${BASE_TEMPLATE_PLACEHOLDER}
\end{document}`;

function createExamService({ examRepo, courseRepo }) {

  const checkCourseAccess = async (courseId, userId) => {
    if (!courseId) throw badRequest("courseId is required");

    const course = await courseRepo.findById(courseId);
    if (!course || course.isDeleted) throw notFound("Course not found");

    const creatorId = course.creator || course.get?.("creator") || course._doc?.creator;
    const collaborators = course.collaborators || course.get?.("collaborators") || course._doc?.collaborators || [];

    const isCreator = String(creatorId) === String(userId);
    const isCollaborator = collaborators.some(cId => String(cId) === String(userId));

    if (!isCreator && !isCollaborator) {
      const e = new Error("Access denied for this course");
      e.status = 403;
      throw e;
    }
  };
  function normalizeSemester(value, { required = false } = {}) {
    if (value === undefined || value === null) {
      if (required) throw badRequest("semester is required");
      return "";
    }
    const semester = String(value).trim();
    if (required && !semester) throw badRequest("semester is required");
    return semester;
  }

  async function ensureBaseTemplateFileExists() {
    try {
      await fs.access(BASE_TEMPLATE_PATH);
    } catch (err) {
      if (err && err.code !== "ENOENT") throw err;
      await fs.mkdir(path.dirname(BASE_TEMPLATE_PATH), { recursive: true });
      await fs.writeFile(BASE_TEMPLATE_PATH, DEFAULT_BASE_TEMPLATE, "utf8");
    }
  }

  function validateBaseTemplateContent(content, { fromUser = false } = {}) {
    const value = String(content || "");
    if (!value.trim()) {
      throw fromUser
        ? badRequest("template cannot be empty")
        : new Error("Base LaTeX template is empty");
    }
    if (!value.includes(BASE_TEMPLATE_PLACEHOLDER)) {
      throw fromUser
        ? badRequest(
            `template must contain placeholder ${BASE_TEMPLATE_PLACEHOLDER}`,
          )
        : new Error(
            `Base LaTeX template must contain placeholder ${BASE_TEMPLATE_PLACEHOLDER}`,
          );
    }
    return value;
  }

  async function loadBaseTemplateContent() {
    await ensureBaseTemplateFileExists();
    const content = await fs.readFile(BASE_TEMPLATE_PATH, "utf8");
    return validateBaseTemplateContent(content);
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

  function stripSolutionEnvironments(source) {
    return String(source || "")
      .replace(/\\begin\{solution\}[\s\S]*?\\end\{solution\}\s*/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function stripDataUrlPrefix(base64) {
    const value = String(base64 || "");
    const match = value.match(/^data:([^;]+);base64,(.*)$/);
    return match ? match[2] : value;
  }

  function sanitizeAssetFilename(filename) {
    return path.basename(String(filename || "").trim());
  }

  function prepareLatexOnlySource({
    latexContent,
    baseTemplateContent,
    version,
  }) {
    const src = String(latexContent || "").trim();
    if (!src) throw badRequest("latexContent is required");
    const normalizedVersion = String(version || "TEACHER").toUpperCase();
    const showSolutions = normalizedVersion !== "STUDENT";
    const sourceWithVersion = showSolutions
      ? src
      : stripSolutionEnvironments(src);

    if (/\\begin\{document\}/i.test(sourceWithVersion)) {
      return withShowSolutionsFlag(sourceWithVersion, showSolutions);
    }

    const template = withShowSolutionsFlag(
      validateBaseTemplateContent(baseTemplateContent),
      showSolutions,
    );
    return template.replace(BASE_TEMPLATE_PLACEHOLDER, sourceWithVersion);
  }

  async function buildLatexOnlyResources(resources, apiBaseUrl) {
    const normalizedResources = Array.isArray(resources) ? resources : [];
    if (normalizedResources.length === 0) {
      return [];
    }

    if (!apiBaseUrl) {
      const e = new Error("API_INTERNAL_BASE_URL is not configured");
      e.status = 500;
      throw e;
    }

    const token = randomProjectId();
    const assetsRoot =
      process.env.DRAFT_ASSETS_DIR || "/tmp/autogenex-draft-assets";
    const assetsDir = path.join(assetsRoot, token);
    await fs.mkdir(assetsDir, { recursive: true });

    const clsiResources = [];

    for (const resource of normalizedResources) {
      const filename = sanitizeAssetFilename(resource?.path);
      const content = String(resource?.content || "").trim();
      if (!filename || !content) continue;

      const diskPath = path.join(assetsDir, filename);
      await fs.writeFile(diskPath, Buffer.from(stripDataUrlPrefix(content), "base64"));

      clsiResources.push({
        path: filename,
        url: `${apiBaseUrl}/api/exams/draft/assets/${token}/${encodeURIComponent(filename)}`,
        modified: Date.now(),
      });
    }

    return clsiResources;
  }

  async function compileLatexOnlyImpl(body, reqId) {
    const clsiUrl = String(process.env.CLSI_URL || "").trim();
    if (!clsiUrl) {
      const e = new Error("CLSI_URL is not configured");
      e.status = 500;
      throw e;
    }

    const latexContent = String(body?.latexContent || "").trim();
    if (!latexContent) throw badRequest("latexContent is required");
    const apiBaseUrl = String(process.env.API_INTERNAL_BASE_URL || "").trim();
    const baseTemplateContent = await loadBaseTemplateContent();
    const mainTex = prepareLatexOnlySource({
      latexContent,
      baseTemplateContent,
      version: body?.version,
    });
    const extraResources = await buildLatexOnlyResources(
      body?.resources,
      apiBaseUrl,
    );

    const projectId = randomProjectId();
    const compileBody = {
      compile: {
        options: {
          compiler: "pdflatex",
          timeout: 300,
        },
        rootResourcePath: "main.tex",
        resources: [{ path: "main.tex", content: mainTex }, ...extraResources],
      },
    };

    const client = createClsiClient({ clsiUrl, logger });
    const result = await client.compile({ projectId, compileBody, reqId });

    if (!result || !result.compile) {
      logger.error({ reqId, clsiResult: result }, "Invalid CLSI response");
      const e = new Error("Invalid CLSI response");
      e.status = 502;
      e.details = result
        ? JSON.stringify(result).slice(0, 20000)
        : "empty response";
      throw e;
    }

    const diagnostics = await buildCompileDiagnostics({
      compile: result.compile,
      client,
      numOrZero,
      maxErrors: 200,
      maxWarnings: 200,
      maxSnippet: 800,
    });

    const pdfFile =
      (result.compile.outputFiles || []).find((f) => f.type === "pdf") ||
      (result.compile.outputFiles || []).find(
        (f) =>
          typeof f.path === "string" &&
          f.path.toLowerCase().endsWith(".pdf") &&
          f.url,
      );

    if (!pdfFile?.url) {
      logger.error({ reqId, clsiResult: result }, "No PDF output URL");
      const e = new Error("CLSI did not return a PDF output URL");
      e.status = 502;
      e.details = {
        clsiStatus: result.compile.status,
        buildId: result.compile.buildId,
        stats: result.compile.stats || {},
        outputFiles: result.compile.outputFiles || [],
        diagnostics,
      };
      throw e;
    }

    const pdfBuffer = await client.downloadAsBuffer(pdfFile.url);

    const filenameBase = "latex-preview";
    const filename = safeFilename(filenameBase) + ".pdf";

    return {
      pdfBuffer,
      filename,
      diagnostics,
      errors: diagnostics,
    };
  }

  async function validateCourseId(courseId) {
    const cid = String(courseId || "").trim();
    if (!cid) throw badRequest("courseId is required");
    if (!isValidObjectId(cid)) throw badRequest("courseId must be a valid id");

    if (courseRepo?.findById) {
      const c = await courseRepo.findById(cid);
      if (!c) throw notFound("Course not found");
      return c;
    }

    return null;
  }

  async function compileDraftImpl(body, reqId, userId) {
    const clsiUrl = String(process.env.CLSI_URL || "").trim();
    if (!clsiUrl) {
      const e = new Error("CLSI_URL is not configured");
      e.status = 500;
      throw e;
    }

    const apiBaseUrl = String(process.env.API_INTERNAL_BASE_URL || "").trim();
    if (!apiBaseUrl) {
      const e = new Error("API_INTERNAL_BASE_URL is not configured");
      e.status = 500;
      throw e;
    }

    const courseId = String(body?.course?.id || body?.courseId || "").trim();
    if (!courseId) throw badRequest("courseId is required for compile");
    if (!isValidObjectId(courseId))
      throw badRequest("courseId must be a valid id");

    await checkCourseAccess(courseId, userId);

    let courseDoc = null;
    if (courseRepo?.findById) courseDoc = await courseRepo.findById(courseId);
    else
      courseDoc = await Course.findOne({
        _id: courseId,
        isDeleted: { $ne: true },
      }).lean();

    if (!courseDoc && body?.course && typeof body.course === "object") {
      courseDoc = {
        _id: courseId,
        id: courseId,
        title: String(body.course.title || ""),
        shortName: String(body.course.shortName || ""),
        coverPage: String(body.course.coverPage || ""),
      };
    }

    if (!courseDoc) throw notFound("Course not found");

    const coverPageFromBody = String(body?.coverPage || "").trim();
    const coverPage = coverPageFromBody
      ? coverPageFromBody
      : String(courseDoc.coverPage || "");

    const topics = Array.isArray(body?.topics) ? body.topics : [];

    const token = randomProjectId();
    const assetsRoot =
      process.env.DRAFT_ASSETS_DIR || "/tmp/autogenex-draft-assets";
    const assetsDir = path.join(assetsRoot, token);
    await fs.mkdir(assetsDir, { recursive: true });

    const { resources: imgResources, nextTopics } =
      await buildClsiImageResourcesFromDraftTopics({
        topics,
        token,
        assetsDir,
        apiBaseUrl,
      });

    const version = String(body?.version || "STUDENT").toUpperCase();
    if (version !== "TEACHER" && version !== "STUDENT") {
      const e = new Error('version must be "TEACHER" or "STUDENT"');
      e.status = 400;
      throw e;
    }

    const baseTemplateContent = await loadBaseTemplateContent();

    const mainTex = buildLatexFromDraft({
      coverPageLatex: coverPage,
      topics: nextTopics,
      version,
      baseTemplate: baseTemplateContent,
      courseTitle: String(courseDoc.title || body?.course?.title || ""),
    });

    const projectId = randomProjectId();

    const compileBody = {
      compile: {
        options: {
          compiler: "pdflatex",
          timeout: 300,
        },
        rootResourcePath: "main.tex",
        resources: [{ path: "main.tex", content: mainTex }, ...imgResources],
      },
    };

    const client = createClsiClient({ clsiUrl, logger });
    const result = await client.compile({ projectId, compileBody, reqId });

    if (!result || !result.compile) {
      logger.error({ reqId, clsiResult: result }, "Invalid CLSI response");
      const e = new Error("Invalid CLSI response");
      e.status = 502;
      e.details = result
        ? JSON.stringify(result).slice(0, 20000)
        : "empty response";
      throw e;
    }

    let errors = null;

    if (hasLatexErrors(result.compile, numOrZero)) {
      logger.warn(
        { reqId, clsiResult: result },
        "CLSI compile produced LaTeX errors",
      );

      const logFile = pickOutputFile(result.compile.outputFiles, "log", ".log");
      const stdoutFile = pickOutputFile(
        result.compile.outputFiles,
        "stdout",
        ".stdout",
      );
      const stderrFile = pickOutputFile(
        result.compile.outputFiles,
        "stderr",
        ".stderr",
      );

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
        maxErrors: 200,
        maxSnippet: 800,
      });

      const parsedWarnings = extractWarningsFromLog(logText, {
        maxWarnings: 200,
      });

      errors = {
        clsiStatus: result.compile.status,
        buildId: result.compile.buildId,
        stats: result.compile.stats || {},
        timings: result.compile.timings || {},
        errorCount: parsedErrors.length,
        warningCount: parsedWarnings.length,
        errors: parsedErrors, 
        warnings: parsedWarnings, 
        log: logText ? logText.slice(0, 20000) : null,
        stdout: stdoutText ? stdoutText.slice(0, 20000) : null,
        stderr: stderrText ? stderrText.slice(0, 20000) : null,
      };
    }
    const diagnostics = await buildCompileDiagnostics({
      compile: result.compile,
      client,
      numOrZero,
      maxErrors: 200,
      maxWarnings: 200,
      maxSnippet: 800,
    });

    const pdfFile =
      (result.compile.outputFiles || []).find((f) => f.type === "pdf") ||
      (result.compile.outputFiles || []).find(
        (f) =>
          typeof f.path === "string" &&
          f.path.toLowerCase().endsWith(".pdf") &&
          f.url,
      );

    if (!pdfFile?.url) {
      logger.error({ reqId, clsiResult: result }, "No PDF output URL");
      const e = new Error("CLSI did not return a PDF output URL");
      e.status = 502;
      e.details = {
        clsiStatus: result.compile.status,
        buildId: result.compile.buildId,
        stats: result.compile.stats || {},
        outputFiles: result.compile.outputFiles || [],
        diagnostics,
      };
      throw e;
    }

    const pdfBuffer = await client.downloadAsBuffer(pdfFile.url);

    const filenameBase = String(
      courseDoc.shortName || courseDoc.title || "exam",
    );
    const filename = safeFilename(filenameBase) + ".pdf";

    return {
      pdfBuffer,
      filename,
      diagnostics,
      errors: diagnostics,
    };
  }

  return {
    async generateDraft(data, userId) {
      const courseId = String(data.courseId || "").trim();
      await validateCourseId(courseId);
      await checkCourseAccess(courseId, userId);

      const targetPoints = numOrZero(data.targetPoints);
      if (targetPoints <= 0) throw badRequest("targetPoints must be > 0");

      const { topicNames, groups } = await loadVariantsByTopicNames({
        courseId,
        topicNames: data.topics,
        badRequest,
      });

      const { chosen, sum } = pickBestCombination(
        groups,
        targetPoints,
        numOrZero,
      );
      const draftTopics = chosen.map((d) => snapshotFromTopicDoc(d, numOrZero));

      const course = courseRepo?.findById
        ? await courseRepo.findById(courseId)
        : null;

      return {
        course: course
          ? {
              id: String(course._id),
              title: course.title,
              shortName: course.shortName,
              coverPage: course.coverPage,
            }
          : { id: courseId },
        topicNames,
        targetPoints,
        totalPoints: sum,
        diff: targetPoints - sum,
        topics: draftTopics,
      };
    },

    async regenerateDraftTopic(data, userId) {
      const courseId = String(data.courseId || "").trim();
      await validateCourseId(courseId);

      await checkCourseAccess(courseId, userId);

      const topicName = String(data.topicName || "").trim();
      if (!topicName) throw badRequest("topicName is required");

      const targetPoints = numOrZero(data.targetPoints);
      if (targetPoints <= 0) throw badRequest("targetPoints must be > 0");

      const current = data.currentDraftTopics || [];
      validateDraftTopicsShape(current, { badRequest, isValidObjectId });

      const idx = current.findIndex((t) => t.topic === topicName);
      if (idx === -1) throw badRequest("topicName not found in current draft");

      const currentTopic = current[idx] || {};
      const currentTopicId = String(
        currentTopic.topicId || currentTopic.id || "",
      ).trim();
      const currentTopicSignature = topicSignature(currentTopic, numOrZero);

      const others = current.filter((_, i) => i !== idx);
      const othersSum = sumTopicPoints(others);

      const variants = await Topic.find({
        courseId,
        topic: topicName,
        isDeleted: { $ne: true },
      }).lean();
      if (!variants.length) throw badRequest("No variants found for topic");

      const candidates = variants.filter((variant) => {
        if (currentTopicId && String(variant._id) === currentTopicId) {
          return false;
        }
        const variantSignature = topicSignature(
          snapshotFromTopicDoc(variant, numOrZero),
          numOrZero,
        );
        return variantSignature !== currentTopicSignature;
      });

      const pool = shuffleArray(candidates.length ? candidates : variants);

      let best = null;
      let bestDiff = Infinity;

      for (const v of pool) {
        const total = othersSum + numOrZero(v.points);
        const diff = Math.abs(total - targetPoints);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = v;
        }
      }

      if (!best) best = pool[0];

      const replaced = snapshotFromTopicDoc(best, numOrZero);

      const next = [...current];
      next[idx] = replaced;

      const totalPoints = sumTopicPoints(next);

      return {
        targetPoints,
        totalPoints,
        diff: targetPoints - totalPoints,
        topics: next,
      };
    },

    async createExam(data, userId) {
      try {
        const courseId = String(data.courseId || "").trim();
        await validateCourseId(courseId);
        const semester = normalizeSemester(data.semester, { required: true });

        await checkCourseAccess(courseId, userId);

        const targetPoints = numOrZero(data.targetPoints);
        if (targetPoints <= 0) throw badRequest("targetPoints must be > 0");

        let topics = data.topics || [];
        validateDraftTopicsShape(topics, { badRequest, isValidObjectId });

        topics = topics.map((t) => {
          const { topicId, ...rest } = t;
          return {
            ...rest,
            courseId,
          };
        });

        const points = sumTopicPoints(topics);

        return examRepo.create({
          courseId,
          semester,
          targetPoints,
          points,
          topics,
        });
      } catch (err) {
        if (err.status && err.status < 500) throw err;
        logger.error({ err, data }, "failed to create exam");
        const e = new Error("Unable to create exam");
        e.status = 500;
        throw e;
      }
    },

    async listExams(query, userId) {
      const courseId = query.courseId
        ? String(query.courseId).trim()
        : undefined;
      
      if (courseId && !isValidObjectId(courseId))
        throw badRequest("courseId must be a valid id");

      const filters = parseFilters(query.filter);
      let allowedCourseIds;

      if (courseId) {
        await checkCourseAccess(courseId, userId);
        filters.courseId = courseId;
      } else {
        const { items: userCourses } = await courseRepo.findAll({
          limit: 1000,
          filter: { 
            $or: [{ creator: userId }, { collaborators: userId }] 
          }
        });
        allowedCourseIds = userCourses.map(c => String(c._id));
      }

      const { page, limit } = normalizePagination(
        query.page,
        query.pageSize || query.limit,
      );

      const sort = parseSort(query.sort);

      const { items, total } = await examRepo.findAll({
        page,
        limit,
        filter: filters,
        sort,
        courseId,
        allowedCourseIds 
      });

      const meta = buildMeta({ total, page, limit });
      return { items, ...meta };
    },

    async getExam(id, userId) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");

      try {
        const exam = await examRepo.findById(id);
        if (!exam) throw notFound("Exam not found");
        
        const cId = exam.courseId?._id || exam.courseId; 
        await checkCourseAccess(cId, userId);

        return exam;
      } catch (err) {
        if (err.status && err.status < 500) {
          throw err;
        }
        logger.error({ err, examId: id }, "failed to load exam by id");
        const e = new Error("Unable to retrieve exam");
        e.status = 500;
        throw e;
      }
    },

    async updateExam(id, data, userId) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");

      const existingExam = await examRepo.findById(id);
      if (!existingExam) throw notFound("Exam not found");
      const oldCourseId = existingExam.courseId?._id || existingExam.courseId;
      await checkCourseAccess(oldCourseId, userId);

      const update = {};

      if (data.courseId !== undefined) {
        const newCourseId = String(data.courseId).trim();
        if (!newCourseId) throw badRequest("courseId cannot be empty");
        if (!isValidObjectId(newCourseId))
          throw badRequest("courseId must be a valid id");
        
        if (String(oldCourseId) !== newCourseId) {
           await checkCourseAccess(newCourseId, userId);
        }
        update.courseId = newCourseId;
      }

      if (data.semester !== undefined) {
        update.semester = normalizeSemester(data.semester, { required: true });
      }

      if (data.targetPoints !== undefined) {
        const tp = numOrZero(data.targetPoints);
        if (tp <= 0) throw badRequest("targetPoints must be > 0");
        update.targetPoints = tp;
      }

      if (data.topics !== undefined) {
        validateDraftTopicsShape(data.topics, { badRequest, isValidObjectId });
        const courseIdForTopics = update.courseId || undefined;
        update.topics = (data.topics || []).map((t) => {
          const { topicId, ...rest } = t;
          return {
            ...rest,
            ...(courseIdForTopics ? { courseId: courseIdForTopics } : {}),
          };
        });
        update.points = sumTopicPoints(update.topics);
      }
      if (data.points !== undefined) {
        const p = numOrZero(data.points);
        if (p < 0) throw badRequest("points must be >= 0");
        update.points = p;
      }

      const updated = await examRepo.updateById(id, update);
      if (!updated) throw notFound("Exam not found");
      return updated;
    },

    async deleteExam(id, userId) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");
      
      const existingExam = await examRepo.findById(id);
      if (!existingExam) throw notFound("Exam not found");
      const cId = existingExam.courseId?._id || existingExam.courseId;
      await checkCourseAccess(cId, userId);

      const deleted = await examRepo.deleteById(id);
      if (!deleted) throw notFound("Exam not found");
      return deleted;
    },

    compileDraft: async (body, reqId, userId) => compileDraftImpl(body, reqId, userId),
    compileLatexOnly: async (body, reqId) => compileLatexOnlyImpl(body, reqId),
    getBaseLatexTemplate: async () => {
      const template = await loadBaseTemplateContent();
      return {
        template,
        placeholder: BASE_TEMPLATE_PLACEHOLDER,
      };
    },
    updateBaseLatexTemplate: async (data) => {
      const nextTemplate = validateBaseTemplateContent(data?.template, {
        fromUser: true,
      });
      await fs.mkdir(path.dirname(BASE_TEMPLATE_PATH), { recursive: true });
      await fs.writeFile(BASE_TEMPLATE_PATH, nextTemplate, "utf8");
      return {
        template: nextTemplate,
        placeholder: BASE_TEMPLATE_PLACEHOLDER,
      };
    },
  };
}

module.exports = {
  createExamService,
};
