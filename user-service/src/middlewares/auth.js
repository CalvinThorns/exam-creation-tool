const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

/**
 * Middleware to extract user ID from JWT token
 * Expects token in Authorization header: "Bearer <token>"
 */
function extractUserFromToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      // Token not provided - allow to continue but userId will be undefined
      return next();
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    req.userId = decoded.sub || decoded.id;
    next();
  } catch (err) {
    // Invalid token - allow to continue, userId will be undefined
    // Controllers can enforce authentication as needed
    next();
  }
}

/**
 * Middleware to require authentication
 * Used for protected routes that require a valid token
 */
function requireAuth(req, res, next) {
  if (!req.userId) {
    const err = new Error("Unauthorized");
    err.status = 401;
    return next(err);
  }
  next();
}

module.exports = {
  extractUserFromToken,
  requireAuth,
};
