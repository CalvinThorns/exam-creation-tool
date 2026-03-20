function buildCourseSearchFilter(q = "") {
  if (!q) return {};

  return {
    $or: [
      { title: { $regex: q, $options: "i" } },
      { shortName: { $regex: q, $options: "i" } },
    ],
  };
}

function buildTopicSearchFilter({ q = "", courseId }) {
  const filter = {};

  if (courseId) filter.courseId = courseId;

  if (q) {
    filter.$or = [
      { topic: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }

  return filter;
}

module.exports = {
  buildCourseSearchFilter,
  buildTopicSearchFilter,
};
