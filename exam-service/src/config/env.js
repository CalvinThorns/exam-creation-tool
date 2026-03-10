const dotenv = require("dotenv");
dotenv.config();

const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  //mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/courses_db",
  mongoUri: process.env.MONGO_URI || "mongodb+srv://lennart18_5:lennart18_5@autogenex-cluster.le5ryfv.mongodb.net/autogenex-db",
};

module.exports = { env };
