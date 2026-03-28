const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const {
  validateRegisterPayload,
  validateLoginPayload,
  validateResetPasswordPayload,
} = require("./helpers/authValidation");
const { conflict, unauthorized } = require("./helpers/authErrors");

function hashRecoveryKey(key) {
  return crypto.createHash("sha256").update(String(key)).digest("hex");
}

function generateRecoveryKey() {
  return crypto.randomBytes(24).toString("hex");
}

function toSafeUser(user) {
  return {
    id: String(user._id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createUserAuthService({ userRepo }) {
  return {
    async register(data) {
      const payload = validateRegisterPayload(data);

      const existing = await userRepo.findByEmail(payload.email);
      if (existing) {
        throw conflict("email already registered");
      }

      const passwordHash = await bcrypt.hash(payload.password, 10);
      const recoveryKey = generateRecoveryKey();
      const recoveryKeyHash = hashRecoveryKey(recoveryKey);

      const created = await userRepo.create({
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        passwordHash,
        recoveryKeyHash,
      });

      return {
        user: toSafeUser(created),
        recoveryKey,
      };
    },

    async login(data) {
      const payload = validateLoginPayload(data);
      const user = await userRepo.findByEmail(payload.email);

      if (!user) {
        throw unauthorized("invalid email or password");
      }

      const isPasswordValid = await bcrypt.compare(
        payload.password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw unauthorized("invalid email or password");
      }

      const accessToken = jwt.sign(
        {
          sub: String(user._id),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn },
      );

      return {
        accessToken,
        tokenType: "Bearer",
        user: toSafeUser(user),
      };
    },

    async resetPassword(data) {
      const payload = validateResetPasswordPayload(data);
      const recoveryKeyHash = hashRecoveryKey(payload.recoveryKey);

      const user = await userRepo.findByEmailAndRecoveryKeyHash(
        payload.email,
        recoveryKeyHash,
      );
      if (!user) {
        throw unauthorized("invalid email or recovery key");
      }

      const newPasswordHash = await bcrypt.hash(payload.newPassword, 10);
      const newRecoveryKey = generateRecoveryKey();
      const newRecoveryKeyHash = hashRecoveryKey(newRecoveryKey);

      const updatedUser = await userRepo.updateById(user._id, {
        passwordHash: newPasswordHash,
        recoveryKeyHash: newRecoveryKeyHash,
      });

      return {
        message: "password reset successful",
        user: toSafeUser(updatedUser),
        recoveryKey: newRecoveryKey,
      };
    },
  };
}

module.exports = { createUserAuthService };
