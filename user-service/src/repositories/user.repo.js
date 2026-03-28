const { User } = require("../models/user.model");
const { applySort } = require("./helpers/queryHelpers");

function createUserRepo() {
  return {
    async create(data) {
      return User.create(data);
    },

    async findAll({ page = 1, limit = 20, filter = {}, sort } = {}) {
      const qfilter = { ...filter, isDeleted: { $ne: true } };

      const query = User.find(qfilter);
      applySort(query, sort);

      const [items, total] = await Promise.all([
        query
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        User.countDocuments(qfilter),
      ]);

      return { items, total };
    },

    async findById(id) {
      return User.findOne({ _id: id, isDeleted: { $ne: true } });
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
