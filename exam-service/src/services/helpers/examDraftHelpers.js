const {
  Topic,
  SOLUTION_SPACE_OPTIONS,
  DEFAULT_SOLUTION_SPACE,
} = require("../../models/topic.model");

function shuffleArray(items) {
  const list = Array.isArray(items) ? [...items] : [];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[randomIndex]] = [list[randomIndex], list[index]];
  }
  return list;
}

function bufferLikeToBase64(value) {
  if (!value) return "";
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (typeof value === "string") return value;
  if (value && Buffer.isBuffer(value.buffer)) {
    return value.buffer.toString("base64");
  }
  if (value && Array.isArray(value.data)) {
    return Buffer.from(value.data).toString("base64");
  }
  return "";
}

function serializeImageLike(image) {
  const base64 = bufferLikeToBase64(image?.data);
  if (!base64) {
    return {
      base64: "",
      contentType: "",
      filename: "",
    };
  }

  return {
    base64,
    contentType: image?.contentType || "",
    filename: image?.filename || "",
  };
}

function serializeAssetLike(asset) {
  const base64 = bufferLikeToBase64(asset?.data);
  if (!base64) {
    return {
      filename: asset?.filename || "",
      contentType: asset?.contentType || "",
      base64: "",
    };
  }

  return {
    filename: asset?.filename || "",
    contentType: asset?.contentType || "",
    base64,
  };
}

function snapshotFromTopicDoc(doc, numOrZero) {
  return {
    topicId: doc?._id ? String(doc._id) : undefined,
    courseId: doc.courseId,
    full_tex_code: doc.full_tex_code || "",
    topic: doc.topic || "",
    description: doc.description || "",
    points: numOrZero(doc.points),
    description_img: serializeImageLike(doc.description_img),
    tasks: Array.isArray(doc.tasks)
      ? doc.tasks.map((t) => ({
          id: t.id || null,
          description: t.description || "",
          full_tex_code: t.full_tex_code || "",
          question: t.question || "",
          points: numOrZero(t.points),
          question_img: serializeImageLike(t.question_img),
          solution: t.solution || "",
          assets: Array.isArray(t.assets)
            ? t.assets.map(serializeAssetLike).filter((asset) => asset.base64)
            : [],
          solutionSpace: SOLUTION_SPACE_OPTIONS.includes(t.solutionSpace)
            ? t.solutionSpace
            : DEFAULT_SOLUTION_SPACE,
          isRelatedToTopic:
            typeof t.isRelatedToTopic === "boolean" ? t.isRelatedToTopic : true,
        }))
      : [],
  };
}

function topicSignature(topic, numOrZero) {
  return JSON.stringify({
    full_tex_code: topic?.full_tex_code || "",
    topic: topic?.topic || "",
    description: topic?.description || "",
    points: numOrZero(topic?.points),
    tasks: Array.isArray(topic?.tasks)
      ? topic.tasks.map((t) => ({
          description: t?.description || "",
          full_tex_code: t?.full_tex_code || "",
          question: t?.question || "",
          points: numOrZero(t?.points),
          solution: t?.solution || "",
          assets: Array.isArray(t?.assets)
            ? t.assets.map((asset) => ({
                filename: asset?.filename || "",
                contentType: asset?.contentType || "",
              }))
            : [],
          solutionSpace: SOLUTION_SPACE_OPTIONS.includes(t?.solutionSpace)
            ? t.solutionSpace
            : DEFAULT_SOLUTION_SPACE,
          isRelatedToTopic:
            typeof t?.isRelatedToTopic === "boolean"
              ? t.isRelatedToTopic
              : true,
        }))
      : [],
  });
}

async function loadVariantsByTopicNames({ courseId, topicNames, badRequest }) {
  if (!Array.isArray(topicNames)) throw badRequest("topics must be an array");
  const cleaned = topicNames.map((t) => String(t || "").trim()).filter(Boolean);
  if (cleaned.length === 0) throw badRequest("topics cannot be empty");

  const docs = await Topic.find({
    courseId,
    isDeleted: { $ne: true },
    topic: { $in: cleaned },
  }).lean();

  const missing = cleaned.filter((name) => !docs.some((d) => d.topic === name));
  if (missing.length) {
    throw badRequest(`No topics found for: ${missing.join(", ")}`);
  }

  const groups = cleaned.map((name) => shuffleArray(docs.filter((d) => d.topic === name)));
  return { topicNames: cleaned, groups };
}

function pickBestCombination(groups, target, numOrZero) {
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

function validateDraftTopicsShape(topics, { badRequest, isValidObjectId }) {
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
        if (
          task.solutionSpace !== undefined &&
          !SOLUTION_SPACE_OPTIONS.includes(String(task.solutionSpace).trim())
        ) {
          throw badRequest(
            `task.solutionSpace must be one of: ${SOLUTION_SPACE_OPTIONS.join(", ")}`,
          );
        }
      }
    }
    if (t.points !== undefined) {
      const p = Number(t.points);
      if (!Number.isFinite(p) || p < 0)
        throw badRequest("Topic points must be >= 0");
    }
  }
}

module.exports = {
  snapshotFromTopicDoc,
  topicSignature,
  loadVariantsByTopicNames,
  pickBestCombination,
  validateDraftTopicsShape,
  shuffleArray,
};
