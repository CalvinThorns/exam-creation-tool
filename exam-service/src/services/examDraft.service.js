const courseRepository = require("../repositories/courseRepository");
const topicRepository = require("../repositories/topicRepository");

function toSnapshot(topicDoc) {
  return {
    topicId: String(topicDoc._id),
    courseId: String(topicDoc.courseId),
    topic: topicDoc.topic,
    description: topicDoc.description || "",
    points: Number(topicDoc.points || 0),
    description_img: topicDoc.description_img || {
      base64: "",
      contentType: "",
      filename: "",
    },
    tasks: Array.isArray(topicDoc.tasks)
      ? topicDoc.tasks.map((t) => ({
          id: t.id || "",
          question: t.question || "",
          points: Number(t.points || 0),
          question_img: t.question_img || {
            base64: "",
            contentType: "",
            filename: "",
          },
          solution: t.solution || "",
          isRelatedToTopic:
            typeof t.isRelatedToTopic === "boolean" ? t.isRelatedToTopic : true,
        }))
      : [],
  };
}

function sumPoints(topics) {
  return (topics || []).reduce((acc, t) => acc + Number(t.points || 0), 0);
}

function pickBestCombination(groups, target) {
  let dp = new Map();
  dp.set(0, { prevSum: null, gi: -1, vi: -1 });

  for (let gi = 0; gi < groups.length; gi++) {
    const next = new Map();
    for (const [sum, meta] of dp.entries()) {
      for (let vi = 0; vi < groups[gi].length; vi++) {
        const ns = sum + Number(groups[gi][vi].points || 0);
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
  for (let gi = groups.length - 1; gi >= 0; gi--) {
    const meta = dp.get(cur);
    chosen[gi] = groups[gi][meta.vi];
    cur = meta.prevSum;
  }

  return { chosen, sum: bestSum };
}

exports.generateDraft = async ({ courseId, topicNames, targetPoints }) => {
  const course = await courseRepository.findById(courseId);
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  const all = await topicRepository.findVariantsByCourseAndTopicNames(
    courseId,
    topicNames,
  );

  const groups = topicNames.map((name) => all.filter((t) => t.topic === name));
  const missing = topicNames.filter(
    (_, i) => !groups[i] || groups[i].length === 0,
  );
  if (missing.length) {
    const err = new Error(`No topics found for: ${missing.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }

  const target = Number(targetPoints || 0);
  const { chosen, sum } = pickBestCombination(groups, target);

  const snapshots = chosen.map(toSnapshot);

  return {
    course: {
      id: String(course._id),
      title: course.title,
      shortName: course.shortName,
      coverPage: course.coverPage,
    },
    targetPoints: target,
    totalPoints: sum,
    diff: target - sum,
    topics: snapshots,
  };
};

// Regenerate one topic inside an existing draft
exports.regenerateTopicInDraft = async ({
  courseId,
  topicName,
  targetPoints,
  currentDraftTopics,
}) => {
  const target = Number(targetPoints || 0);
  const current = Array.isArray(currentDraftTopics) ? currentDraftTopics : [];

  // Sum all points except this topicName
  const others = current.filter((t) => t.topic !== topicName);
  const othersSum = sumPoints(others);

  // All variants for this topicName
  const variants = await topicRepository.findVariantsByCourseAndTopicName(
    courseId,
    topicName,
  );
  if (!variants.length) {
    const err = new Error("No variants found for topic");
    err.statusCode = 400;
    throw err;
  }

  // Try to pick the variant that makes total closest to target
  let best = null;
  let bestDiff = Infinity;
  for (const v of variants) {
    const total = othersSum + Number(v.points || 0);
    const diff = Math.abs(total - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = v;
    }
  }

  const replaced = toSnapshot(best);

  const nextTopics = [...others, replaced];
  const totalPoints = sumPoints(nextTopics);

  return {
    targetPoints: target,
    totalPoints,
    diff: target - totalPoints,
    topics: nextTopics,
  };
};
