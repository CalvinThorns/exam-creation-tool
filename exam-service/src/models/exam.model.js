const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    points: { type: Number, required: true, min: 0 },
    topics: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Topic", default: [] },
    ],
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
