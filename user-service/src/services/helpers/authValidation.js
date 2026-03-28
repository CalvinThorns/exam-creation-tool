const { badRequest } = require("./authErrors");

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function ensureStrongPassword(password, fieldName = "password") {
  const value = String(password || "");
  const hasRequiredComplexity = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);

  if (!hasRequiredComplexity) {
    throw badRequest(
      `${fieldName} must be at least 8 characters long and include at least one number and one special character`,
    );
  }
}

function validateRegisterPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("request body is required");
  }

  const email = normalizeEmail(payload.email);
  const firstName = String(payload.firstName || "").trim();
  const lastName = String(payload.lastName || "").trim();
  const password = String(payload.password || "");

  if (!email) throw badRequest("email is required");
  if (!firstName) throw badRequest("firstName is required");
  if (!lastName) throw badRequest("lastName is required");
  if (!password) throw badRequest("password is required");

  ensureStrongPassword(password, "password");

  return { email, firstName, lastName, password };
}

function validateLoginPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("request body is required");
  }

  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");

  if (!email) throw badRequest("email is required");
  if (!password) throw badRequest("password is required");

  return { email, password };
}

function validateResetPasswordPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("request body is required");
  }

  const email = normalizeEmail(payload.email);
  const recoveryKey = String(payload.recoveryKey || "").trim();
  const newPassword = String(payload.newPassword || "");

  if (!email) throw badRequest("email is required");
  if (!recoveryKey) throw badRequest("recoveryKey is required");
  if (!newPassword) throw badRequest("newPassword is required");

  ensureStrongPassword(newPassword, "newPassword");

  return { email, recoveryKey, newPassword };
}

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
  validateResetPasswordPayload,
  normalizeEmail,
};
