const { normalizePagination, buildMeta } = require("../utils/pagination");
const { parseFilters, parseSort } = require("../utils/query");
const {
  badRequest,
  notFound,
  isValidObjectId,
} = require("./helpers/userServiceCommon");

function createUserService({ userRepo }) {
  return {
    async listUsers(query) {
      const { page, limit } = normalizePagination(
        query.page,
        query.pageSize || query.limit,
      );

      const filters = parseFilters(query.filter);
      const sort = parseSort(query.sort);

      const { items, total } = await userRepo.findAll({
        page,
        limit,
        filter: filters,
        sort,
      });

      const meta = buildMeta({ total, page, limit });
      return { items, ...meta };
    },

    async getUserById(id) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");
      const user = await userRepo.findById(id);
      if (!user) throw notFound("User not found");
      return user;
    },
  };
}

module.exports = { createUserService };
