const path = require("path");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const { Topic } = require("../models/topic.model");
const crypto = require("crypto");
const { createClsiClient } = require("./clsiClient");
const { buildLatexFromDraft } = require("./examLatexBuilder");
const { logger } = require("../middlewares/logger");
const { Course } = require("../models/course.model");
const { buildClsiImageResourcesFromDraftTopics } = require("./draftAssets");

function createExamService({ examRepo, courseRepo }) {
  function badRequest(message) {
    const err = new Error(message);
    err.status = 400;
    return err;
  }

  function notFound(message) {
    const err = new Error(message);
    err.status = 404;
    return err;
  }

  function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(String(id));
  }

  function randomProjectId() {
    return crypto.randomBytes(12).toString("hex");
  }

  function safeFilename(name) {
    return (
      String(name || "exam")
        .replace(/[^a-z0-9-_]+/gi, "_")
        .slice(0, 60) || "exam"
    );
  }

  function numOrZero(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function sumTopicPoints(topics) {
    return (topics || []).reduce((acc, t) => acc + numOrZero(t.points), 0);
  }

  function snapshotFromTopicDoc(doc) {
    return {
      topicId: doc?._id ? String(doc._id) : undefined,
      courseId: doc.courseId,
      topic: doc.topic || "",
      description: doc.description || "",
      points: numOrZero(doc.points),
      description_img: doc.description_img || {
        base64: "",
        contentType: "",
        filename: "",
      },
      tasks: Array.isArray(doc.tasks)
        ? doc.tasks.map((t) => ({
            id: t.id || null,
            question: t.question || "",
            points: numOrZero(t.points),
            question_img: t.question_img || {
              base64: "",
              contentType: "",
              filename: "",
            },
            solution: t.solution || "",
            isRelatedToTopic:
              typeof t.isRelatedToTopic === "boolean"
                ? t.isRelatedToTopic
                : true,
          }))
        : [],
    };
  }

  function topicSignature(topic) {
    return JSON.stringify({
      topic: topic?.topic || "",
      description: topic?.description || "",
      points: numOrZero(topic?.points),
      tasks: Array.isArray(topic?.tasks)
        ? topic.tasks.map((t) => ({
            question: t?.question || "",
            points: numOrZero(t?.points),
            solution: t?.solution || "",
            isRelatedToTopic:
              typeof t?.isRelatedToTopic === "boolean"
                ? t.isRelatedToTopic
                : true,
          }))
        : [],
    });
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

  async function loadVariantsByTopicNames(courseId, topicNames) {
    if (!Array.isArray(topicNames)) throw badRequest("topics must be an array");
    const cleaned = topicNames
      .map((t) => String(t || "").trim())
      .filter(Boolean);
    if (cleaned.length === 0) throw badRequest("topics cannot be empty");

    const docs = await Topic.find({
      courseId,
      topic: { $in: cleaned },
    }).lean();

    const missing = cleaned.filter(
      (name) => !docs.some((d) => d.topic === name),
    );
    if (missing.length) {
      throw badRequest(`No topics found for: ${missing.join(", ")}`);
    }

    const groups = cleaned.map((name) => docs.filter((d) => d.topic === name));
    return { topicNames: cleaned, groups };
  }

  function pickBestCombination(groups, target) {
    let dp = new Map();
    dp.set(0, { prevSum: null, gi: -1, vi: -1 });

    for (let gi = 0; gi < groups.length; gi++) {
      const next = new Map();
      for (const [sum] of dp.entries()) {
        for (let vi = 0; vi < groups[gi].length; vi++) {
          const ns = sum + numOrZero(groups[gi][vi].points);
          if (!next.has(ns)) next.set(ns, { prevSum: sum, gi, vi });
        }
      }
      dp = next;
    }

    const layers = [];
    layers.push(new Map([[0, { prevSum: null, vi: null }]]));

    for (let gi = 0; gi < groups.length; gi++) {
      const prev = layers[gi];
      const layer = new Map();
      for (const [sum] of prev.entries()) {
        for (let vi = 0; vi < groups[gi].length; vi++) {
          const ns = sum + numOrZero(groups[gi][vi].points);
          if (!layer.has(ns)) layer.set(ns, { prevSum: sum, vi });
        }
      }
      layers.push(layer);
    }

    const finalLayer = layers[layers.length - 1];
    let bestSum = null;
    let bestDiff = Infinity;
    for (const sum of finalLayer.keys()) {
      const diff = Math.abs(sum - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSum = sum;
      }
    }

    const chosen = Array(groups.length).fill(null);
    let cur = bestSum;
    for (let gi = groups.length - 1; gi >= 0; gi--) {
      const meta = layers[gi + 1].get(cur);
      chosen[gi] = groups[gi][meta.vi];
      cur = meta.prevSum;
    }

    return { chosen, sum: bestSum };
  }

  function validateDraftTopicsShape(topics) {
    if (!Array.isArray(topics)) throw badRequest("topics must be an array");
    for (const t of topics) {
      if (!t || typeof t !== "object")
        throw badRequest("Each topic must be an object");
      if (!t.topic || typeof t.topic !== "string")
        throw badRequest("Each topic must have a string 'topic' property");
      if (t.courseId && !isValidObjectId(t.courseId))
        throw badRequest("topic.courseId must be a valid id");
      if (t.tasks) {
        if (!Array.isArray(t.tasks))
          throw badRequest("Topic tasks must be an array");
        for (const task of t.tasks) {
          if (task.id && !isValidObjectId(task.id))
            throw badRequest("Each task id must be a valid id");
        }
      }
      if (t.points !== undefined) {
        const p = Number(t.points);
        if (!Number.isFinite(p) || p < 0)
          throw badRequest("Topic points must be >= 0");
      }
    }
  }

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

      // TeX errors start with "! "
      if (!line.startsWith("!")) continue;

      const message = line.replace(/^!\s*/, "").trim();

      // Look ahead for "l.<num>" and collect a short snippet
      let texLine = null;
      let snippetLines = [line];

      for (let j = i + 1; j < lines.length && j < i + 40; j++) {
        const lj = lines[j];
        snippetLines.push(lj);

        const m = lj.match(/^l\.(\d+)\s*(.*)$/);
        if (m && texLine === null) texLine = Number(m[1]);

        // Stop snippet on blank line after we've seen some context
        if (j > i + 2 && lj.trim() === "") break;

        // Stop if next error begins
        if (j > i && lines[j + 1] && lines[j + 1].startsWith("!")) break;
      }

      const snippet = snippetLines.join("\n").slice(0, maxSnippet);

      errors.push({
        message,
        line: texLine, // may be null
        snippet,
      });

      if (errors.length >= maxErrors) break;
    }

    // De-dupe common repeats
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

  async function compileDraftImpl(body, reqId) {
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

    let courseDoc = null;
    if (courseRepo?.findById) courseDoc = await courseRepo.findById(courseId);
    else courseDoc = await Course.findById(courseId).lean();

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

    const mainTex = buildLatexFromDraft({
      coverPageLatex: coverPage,
      topics: nextTopics,
      version,
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
        errors: parsedErrors, // ALL errors
        warnings: parsedWarnings, // optional
        // keep full log snippet if you want, but it can be large
        log: logText ? logText.slice(0, 20000) : null,
        stdout: stdoutText ? stdoutText.slice(0, 20000) : null,
        stderr: stderrText ? stderrText.slice(0, 20000) : null,
      };
    }

    // ALWAYS try to fetch the PDF (like before)
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
        errors,
      };
      throw e;
    }

    const pdfBuffer = await client.downloadAsBuffer(pdfFile.url);

    const filenameBase = String(
      courseDoc.shortName || courseDoc.title || "exam",
    );
    const filename = safeFilename(filenameBase) + ".pdf";

    return { pdfBuffer, filename, errors };
  }

  return {
    async generateDraft(data) {
      const courseId = String(data.courseId || "").trim();
      await validateCourseId(courseId);

      const targetPoints = numOrZero(data.targetPoints);
      if (targetPoints <= 0) throw badRequest("targetPoints must be > 0");

      const { topicNames, groups } = await loadVariantsByTopicNames(
        courseId,
        data.topics,
      );

      const { chosen, sum } = pickBestCombination(groups, targetPoints);
      const draftTopics = chosen.map((d) => snapshotFromTopicDoc(d));

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

    async regenerateDraftTopic(data) {
      const courseId = String(data.courseId || "").trim();
      await validateCourseId(courseId);

      const topicName = String(data.topicName || "").trim();
      if (!topicName) throw badRequest("topicName is required");

      const targetPoints = numOrZero(data.targetPoints);
      if (targetPoints <= 0) throw badRequest("targetPoints must be > 0");

      const current = data.currentDraftTopics || [];
      validateDraftTopicsShape(current);

      const idx = current.findIndex((t) => t.topic === topicName);
      if (idx === -1) throw badRequest("topicName not found in current draft");

      const currentTopic = current[idx] || {};
      const currentTopicId = String(
        currentTopic.topicId || currentTopic.id || "",
      ).trim();
      const currentTopicSignature = topicSignature(currentTopic);

      const others = current.filter((_, i) => i !== idx);
      const othersSum = sumTopicPoints(others);

      const variants = await Topic.find({ courseId, topic: topicName }).lean();
      if (!variants.length) throw badRequest("No variants found for topic");

      const candidates = variants.filter((variant) => {
        if (currentTopicId && String(variant._id) === currentTopicId) {
          return false;
        }
        const variantSignature = topicSignature(snapshotFromTopicDoc(variant));
        return variantSignature !== currentTopicSignature;
      });

      const pool = candidates.length ? candidates : variants;

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

      const replaced = snapshotFromTopicDoc(best);

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

    async createExam(data) {
      try {
        const courseId = String(data.courseId || "").trim();
        await validateCourseId(courseId);

        const targetPoints = numOrZero(data.targetPoints);
        if (targetPoints <= 0) throw badRequest("targetPoints must be > 0");

        let topics = data.topics || [];
        validateDraftTopicsShape(topics);

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

    async listExams(query) {
      const courseId = query.courseId
        ? String(query.courseId).trim()
        : undefined;
      if (courseId && !isValidObjectId(courseId))
        throw badRequest("courseId must be a valid id");

      const { normalizePagination, buildMeta } = require("../utils/pagination");
      const { parseFilters, parseSort } = require("../utils/query");

      const { page, limit } = normalizePagination(
        query.page,
        query.pageSize || query.limit,
      );

      const filters = parseFilters(query.filter);
      if (courseId) filters.courseId = courseId;
      const sort = parseSort(query.sort);

      const { items, total } = await examRepo.findAll({
        page,
        limit,
        filter: filters,
        sort,
      });

      const meta = buildMeta({ total, page, limit });
      return { items, ...meta };
    },

    async getExam(id) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");

      try {
        const exam = await examRepo.findById(id);
        if (!exam) throw notFound("Exam not found");
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

    async updateExam(id, data) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");

      const update = {};

      if (data.courseId !== undefined) {
        const courseId = String(data.courseId).trim();
        if (!courseId) throw badRequest("courseId cannot be empty");
        if (!isValidObjectId(courseId))
          throw badRequest("courseId must be a valid id");
        update.courseId = courseId;
      }

      if (data.targetPoints !== undefined) {
        const tp = numOrZero(data.targetPoints);
        if (tp <= 0) throw badRequest("targetPoints must be > 0");
        update.targetPoints = tp;
      }

      if (data.topics !== undefined) {
        validateDraftTopicsShape(data.topics);
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

    async deleteExam(id) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");
      const deleted = await examRepo.deleteById(id);
      if (!deleted) throw notFound("Exam not found");
      return deleted;
    },

    compileDraft: async (body, reqId) => compileDraftImpl(body, reqId),
  };
}

module.exports = {
  createExamService,
};
