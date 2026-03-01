const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, default: null },
    contentType: { type: String, default: "" }, // "image/png"
    filename: { type: String, default: "" }, // optional
  },
  {
    _id: false,
  },
);

const taskSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true }, // LaTeX
    points: { type: Number, required: true, min: 0 },
    question_img: { type: imageSchema, default: () => ({}) }, // stored in DB
    solution: { type: String, default: "", trim: true }, // LaTeX
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

    topic: { type: String, required: true, trim: true }, // LaTeX
    description: { type: String, default: "", trim: true }, // LaTeX
    points: { type: Number, required: true, min: 0 },

    description_img: { type: imageSchema, default: () => ({}) }, // stored in DB
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

module.exports = { Topic };
