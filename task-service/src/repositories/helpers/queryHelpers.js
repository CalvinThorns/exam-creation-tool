function applySort(query, sort, defaultSort = { createdAt: -1 }) {
  if (sort && Object.keys(sort).length) {
    query.sort(sort);
    return;
  }
  query.sort(defaultSort);
}

module.exports = {
  applySort,
};
