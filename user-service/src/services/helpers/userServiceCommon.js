const mongoose = require("mongoose");

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

module.exports = {
  badRequest,
  notFound,
  isValidObjectId,
};
