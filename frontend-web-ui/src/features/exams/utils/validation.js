/**
 * Shared points validation utilities for topic/task and exam editing flows.
 */

export function sumTaskPoints(tasks = []) {
  return (tasks || []).reduce(
    (acc, task) => acc + Number(task?.points || 0),
    0,
  );
}

function normalizeTopicName(topic, topicIndex) {
  const raw = String(topic?.topic || "").trim();
  if (raw) return raw;
  return `#${topicIndex + 1}`;
}

/**
 * Validates a single topic's points against its task points sum.
 */
export function validateTopicPoints(topic, topicIndex = 0) {
  if (!topic) {
    return { isValid: true };
  }

  const taskPoints = sumTaskPoints(topic.tasks || []);
  const topicPoints = Number(topic.points || 0);

  if (taskPoints === topicPoints) {
    return {
      isValid: true,
      taskPoints,
      topicPoints,
      topicName: normalizeTopicName(topic, topicIndex),
      topicIndex,
    };
  }

  const topicName = normalizeTopicName(topic, topicIndex);
  return {
    isValid: false,
    taskPoints,
    topicPoints,
    topicName,
    topicIndex,
    error: `Topic "${topicName}": tasks ${taskPoints} pts != topic ${topicPoints} pts`,
  };
}

/**
 * Validates all topics in the exam and returns detailed mismatch information.
 */
export function validateExamTopics(topics = []) {
  const topicErrors = [];

  (topics || []).forEach((topic, topicIndex) => {
    const validation = validateTopicPoints(topic, topicIndex);
    if (!validation.isValid) {
      topicErrors.push(validation);
    }
  });

  return {
    isValid: topicErrors.length === 0,
    errors: topicErrors.map((entry) => entry.error),
    invalidTopics: topicErrors.map((entry) => entry.topicName),
    topicErrors,
    firstError: topicErrors[0] || null,
  };
}

/**
 * Builds the points label shown beside the exam title.
 */
export function createExamValidationLabel(draft) {
  if (!draft) {
    return { label: "", isValid: true };
  }

  const validation = validateExamTopics(draft.topics || []);
  return {
    label: `${draft.totalPoints} / ${draft.targetPoints} pts`,
    isValid: validation.isValid,
  };
}

/**
 * Validates topic create/edit payload (single topic form).
 */
export function validateTopicFormPoints(topicPoints, tasks = []) {
  const normalizedTopic = {
    topic: "",
    points: topicPoints,
    tasks: tasks || [],
  };
  return validateTopicPoints(normalizedTopic, 0);
}

/**
 * Builds the points label shown beside create/edit tasks title.
 */
export function createTopicFormValidationLabel(topicPoints, tasks = []) {
  const validation = validateTopicFormPoints(topicPoints, tasks);
  return {
    label: `${validation.taskPoints} / ${validation.topicPoints} pts`,
    isValid: validation.isValid,
    validation,
  };
}
