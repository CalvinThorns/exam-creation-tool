function normalizePagination(page = 1, limit = 20) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

  return {
    page: safePage,
    limit: safeLimit,
  };
}

function buildPaginationMeta({ page, limit, total }) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

module.exports = {
  normalizePagination,
  buildPaginationMeta,
};
