const path = require("path"); // Add this
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

    // Ensure each requested topic name has at least one variant
    const missing = cleaned.filter(
      (name) => !docs.some((d) => d.topic === name),
    );
    if (missing.length) {
      throw badRequest(`No topics found for: ${missing.join(", ")}`);
    }

    // Preserve the user order
    const groups = cleaned.map((name) => docs.filter((d) => d.topic === name));
    return { topicNames: cleaned, groups };
  }

  // Multi choice DP: pick 1 variant per group to minimize abs(sum - target)
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

    let bestSum = null;
    let bestDiff = Infinity;
    for (const sum of dp.keys()) {
      const diff = Math.abs(sum - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSum = sum;
      }
    }

    const chosen = Array(groups.length).fill(null);
    let cur = bestSum;

    // Reconstruct: we need per-layer dp states; easiest is store parents per layer.
    // To keep code simple, do reconstruction with a second DP that stores parent pointers per layer.
    // Since groups are small, this is fine.

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

    // find bestSum again from final layer
    const finalLayer = layers[layers.length - 1];
    bestSum = null;
    bestDiff = Infinity;
    for (const sum of finalLayer.keys()) {
      const diff = Math.abs(sum - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSum = sum;
      }
    }

    cur = bestSum;
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

    // Prepare temp asset folder
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

    const mainTex = buildLatexFromDraft({
      coverPageLatex: coverPage,
      topics: nextTopics,
    });

    const projectId = randomProjectId();

    // CLSI expects: content for .tex, url for binaries (images)
    const compileBody = {
      compile: {
        options: {
          compiler: "pdflatex",
          timeout: 300, // seconds
        },
        rootResourcePath: "main.tex",
        resources: [{ path: "main.tex", content: mainTex }, ...imgResources],
      },
    };

    const client = createClsiClient({ clsiUrl, logger });
    result = await client.compile({ projectId, compileBody, reqId });

    if (!result || !result.compile) {
      logger.error({ reqId, clsiResult: result }, "Invalid CLSI response");
      const e = new Error("Invalid CLSI response");
      e.status = 502;
      e.details = result
        ? JSON.stringify(result).slice(0, 20000)
        : "empty response";
      throw e;
    }

    if (result.compile.status !== "success") {
      logger.error({ reqId, clsiResult: result }, "CLSI compile failed");

      const logFile = (result.compile.outputFiles || []).find(
        (f) => f.type === "log",
      );
      let details = JSON.stringify(result).slice(0, 20000);

      if (logFile?.url) {
        try {
          const buf = await client.downloadAsBuffer(logFile.url);
          details = buf.toString("utf8").slice(0, 20000);
        } catch (downloadErr) {
          details = `Compile failed and log download failed: ${downloadErr.message}`;
        }
      }

      const e = new Error("LaTeX compile failed");
      e.status = 400;
      e.details = details;
      throw e;
    }

    const pdfFile = (result.compile.outputFiles || []).find(
      (f) => f.type === "pdf",
    );
    if (!pdfFile?.url) {
      logger.error(
        { reqId, clsiResult: result },
        "CLSI success but no PDF output",
      );
      const e = new Error("CLSI did not return a PDF output URL");
      e.status = 502;
      e.details = JSON.stringify(result).slice(0, 20000);
      throw e;
    }

    const pdfBuffer = await client.downloadAsBuffer(pdfFile.url);

    const filenameBase = String(
      courseDoc.shortName || courseDoc.title || "exam",
    );
    const filename = safeFilename(filenameBase) + ".pdf";

    return { pdfBuffer, filename };
  }

  return {
    // 1) Draft generate: NO DB WRITE
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

    // 2) Draft regenerate topic: NO DB WRITE
    async regenerateDraftTopic(data) {
      const courseId = String(data.courseId || "").trim();
      await validateCourseId(courseId);

      const topicName = String(data.topicName || "").trim();
      if (!topicName) throw badRequest("topicName is required");

      const targetPoints = numOrZero(data.targetPoints);
      if (targetPoints <= 0) throw badRequest("targetPoints must be > 0");

      const current = data.currentDraftTopics || [];
      validateDraftTopicsShape(current);

      // keep order: replace in same index if exists
      const idx = current.findIndex((t) => t.topic === topicName);
      if (idx === -1) throw badRequest("topicName not found in current draft");

      const others = current.filter((_, i) => i !== idx);
      const othersSum = sumTopicPoints(others);

      const variants = await Topic.find({ courseId, topic: topicName }).lean();
      if (!variants.length) throw badRequest("No variants found for topic");

      let best = null;
      let bestDiff = Infinity;

      for (const v of variants) {
        const total = othersSum + numOrZero(v.points);
        const diff = Math.abs(total - targetPoints);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = v;
        }
      }

      if (!best) best = variants[0];

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

    // 3) Create exam: ONLY ON SAVE (DB WRITE)
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
