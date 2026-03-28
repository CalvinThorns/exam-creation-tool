function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = "BAD_REQUEST";
  return err;
}

function unauthorized(message) {
  const err = new Error(message);
  err.status = 401;
  err.code = "UNAUTHORIZED";
  return err;
}

function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  err.code = "CONFLICT";
  return err;
}

module.exports = {
  badRequest,
  unauthorized,
  conflict,
};
