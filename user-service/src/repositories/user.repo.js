const { User } = require("../models/user.model");

function createUserRepo() {
  return {
    async create(data) {
      return User.create(data);
    },

    async findByEmail(email) {
      return User.findOne({
        email: String(email || "")
          .trim()
          .toLowerCase(),
        isDeleted: { $ne: true },
      });
    },

    async findByEmailAndRecoveryKeyHash(email, recoveryKeyHash) {
      return User.findOne({
        email: String(email || "")
          .trim()
          .toLowerCase(),
        recoveryKeyHash,
        isDeleted: { $ne: true },
      });
    },

    async updateById(id, update) {
      return User.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        update,
        {
          new: true,
          runValidators: true,
        },
      );
    },
  };
}

module.exports = { createUserRepo };
