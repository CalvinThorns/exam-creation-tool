const mongoose = require("mongoose");

const SOLUTION_SPACE_OPTIONS = [
  "1/4 Page",
  "1/2 Page",
  "3/4 Page",
  "1 Page",
  "2 Pages",
];
const DEFAULT_SOLUTION_SPACE = "1 Page";

function bufferLikeToBase64(value) {
  if (!value) {
    return "";
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }
  if (value && typeof value.toString === "function" && value._bsontype === "Binary") {
    try {
      return Buffer.from(value.buffer).toString("base64");
    } catch (_error) {
      return "";
    }
  }
  if (value && Buffer.isBuffer(value.buffer)) {
    return value.buffer.toString("base64");
  }
  if (value && Array.isArray(value.data)) {
    return Buffer.from(value.data).toString("base64");
  }
  if (typeof value === "string") {
    return value;
  }
  return "";
}

const imageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, default: null },
    contentType: { type: String, default: "" },
    filename: { type: String, default: "" },
  },
  {
    _id: false,
  },
);

const assetSchema = new mongoose.Schema(
  {
    data: { type: Buffer, default: null },
    contentType: { type: String, default: "" },
    filename: { type: String, default: "" },
  },
  {
    _id: false,
  },
);

const taskSchema = new mongoose.Schema(
  {
    description: { type: String, default: "", trim: true },
    full_tex_code: { type: String, default: "", trim: true },
    question: { type: String, required: true, trim: true },
    points: { type: Number, required: true, min: 0 },
    question_img: { type: imageSchema, default: () => ({}) },
    solution: { type: String, default: "", trim: true },
    assets: { type: [assetSchema], default: [] },
    solutionSpace: {
      type: String,
      enum: SOLUTION_SPACE_OPTIONS,
      default: DEFAULT_SOLUTION_SPACE,
      trim: true,
    },
    isRelatedToTopic: { type: Boolean, default: true },
  },
  {
    _id: true,
    timestamps: false,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;

        if (ret.question_img && ret.question_img.data) {
          ret.question_img = {
            hasImage: true,
            contentType: ret.question_img.contentType || "",
            filename: ret.question_img.filename || "",
          };
        } else {
          ret.question_img = { hasImage: false };
        }

        ret.assets = Array.isArray(ret.assets)
          ? ret.assets
              .filter((asset) => asset && asset.data)
              .map((asset) => ({
                filename: asset.filename || "",
                contentType: asset.contentType || "",
                base64: bufferLikeToBase64(asset.data),
              }))
              .filter((asset) => asset.base64)
          : [];

        return ret;
      },
    },
  },
);

const topicSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    full_tex_code: { type: String, default: "", trim: true },
    topic: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    points: { type: Number, required: true, min: 0 },
    isDeleted: { type: Boolean, default: false },

    description_img: { type: imageSchema, default: () => ({}) },
    tasks: { type: [taskSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;

        if (ret.description_img && ret.description_img.data) {
          ret.description_img = {
            hasImage: true,
            contentType: ret.description_img.contentType || "",
            filename: ret.description_img.filename || "",
          };
        } else {
          ret.description_img = { hasImage: false };
        }

        return ret;
      },
    },
  },
);

const Topic = mongoose.model("Topic", topicSchema);

module.exports = {
  Topic,
  topicSchema,
  SOLUTION_SPACE_OPTIONS,
  DEFAULT_SOLUTION_SPACE,
};
