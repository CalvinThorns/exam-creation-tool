const dotenv = require("dotenv");
dotenv.config();

const env = {
  port: Number(process.env.PORT || 3002),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/autogenex-db",
  jwtSecret: process.env.JWT_SECRET || "dev-user-service-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

module.exports = { env };
