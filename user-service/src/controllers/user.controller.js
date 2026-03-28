const { sendSuccess, sendError } = require("../utils/response");

function createUserController({ userService }) {
  return {
    list: async (req, res, next) => {
      try {
        const result = await userService.listUsers(req.query);
        const { items, ...meta } = result;
        return sendSuccess(res, {
          req,
          data: items,
          meta,
        });
      } catch (err) {
        next(err);
      }
    },

    getById: async (req, res, next) => {
      try {
        const user = await userService.getUserById(req.params.id);
        return sendSuccess(res, { req, data: user });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createUserController };
