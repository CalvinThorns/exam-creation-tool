const mongoose = require("mongoose");

const { topicSchema } = require("./topic.model");
const { courseSchema } = require("./course.model");

const topicSnapshotSchema = new mongoose.Schema(topicSchema.obj, {
  _id: false,
  timestamps: false,
});

const courseSnapshotSchema = new mongoose.Schema(courseSchema.obj, {
  timestamps: false,
});

const examSchema = new mongoose.Schema(
  {
    course: {
      type: courseSnapshotSchema,
    },
    points: { type: Number, required: true, min: 0 },
    topics: {
      type: [topicSnapshotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

const Exam = mongoose.model("Exam", examSchema);

module.exports = { Exam };
