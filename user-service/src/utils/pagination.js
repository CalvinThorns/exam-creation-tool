// utilities for normalizing and computing pagination metadata
const { toNumberOrFallback, clamp } = require("./helpers/numberHelpers");

function normalizePagination(page, limit) {
  const p = Math.max(1, toNumberOrFallback(page, 1));
  const l = clamp(toNumberOrFallback(limit, 20), 1, 100);
  return { page: p, limit: l };
}

function buildMeta({ total, page, limit }) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

module.exports = { normalizePagination, buildMeta };
