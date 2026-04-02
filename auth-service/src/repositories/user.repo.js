const User = require('../models/user.model');

function createUserRepo() {
  return {
    findByEmail: async (email) => {
      return await User.findOne({ email });
    },
    create: async (userData) => {
  return User.create(userData);
},
  };
}

module.exports = { createUserRepo };