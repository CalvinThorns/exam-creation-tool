const { sendSuccess } = require("../utils/response");

function createUserAuthController({ userAuthService }) {
  return {
    register: async (req, res, next) => {
      try {
        const result = await userAuthService.register(req.body);
        return sendSuccess(res, { req, data: result, status: 201 });
      } catch (err) {
        next(err);
      }
    },

    login: async (req, res, next) => {
      try {
        const result = await userAuthService.login(req.body);
        return sendSuccess(res, { req, data: result });
      } catch (err) {
        next(err);
      }
    },

    resetPassword: async (req, res, next) => {
      try {
        const result = await userAuthService.resetPassword(req.body);
        return sendSuccess(res, { req, data: result });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createUserAuthController };
