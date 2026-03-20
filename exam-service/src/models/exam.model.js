const mongoose = require("mongoose");

const { topicSchema } = require("./topic.model");

const topicSnapshotSchema = new mongoose.Schema(topicSchema.obj, {
  _id: false,
  timestamps: false,
});
const examSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    points: { type: Number, required: true, min: 0 },
    isDeleted: { type: Boolean, default: false },
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
