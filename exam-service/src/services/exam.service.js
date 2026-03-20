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
  validateDraftTopicsShape,
} = require("./helpers/examDraftHelpers");
const {
  hasLatexErrors,
  pickOutputFile,
  downloadTextFileIfAny,
  parseLatexErrorsFromLog,
  extractWarningsFromLog,
} = require("./helpers/latexCompileHelpers");
const { normalizePagination, buildMeta } = require("../utils/pagination");
const { parseFilters, parseSort } = require("../utils/query");

function createExamService({ examRepo, courseRepo }) {
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
    else
      courseDoc = await Course.findOne({
        _id: courseId,
        isDeleted: { $ne: true },
      }).lean();

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

    async regenerateDraftTopic(data) {
      const courseId = String(data.courseId || "").trim();
      await validateCourseId(courseId);

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

    async createExam(data) {
      try {
        const courseId = String(data.courseId || "").trim();
        await validateCourseId(courseId);

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
