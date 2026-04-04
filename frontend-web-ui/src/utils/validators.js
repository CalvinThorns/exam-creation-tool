import { z } from "zod";

export const courseSchema = (t) =>
  z
    .object({
      title: z.string().min(1, t("errors.requiredTitle")),
      coverPage: z.string(),
      topics: z
        .array(z.string().trim().min(1, t("errors.requiredCourseTopic")))
        .default([]),
    })
    .superRefine((values, ctx) => {
      const seen = new Map();

      values.topics.forEach((topic, index) => {
        const normalized = String(topic || "").trim().toLowerCase();
        if (!normalized) return;

        if (seen.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["topics", index],
            message: t("errors.duplicateCourseTopic"),
          });
          return;
        }

        seen.set(normalized, index);
      });
    });

export const topicSchema = (t) =>
  z.object({
    courseId: z.string().min(1, t("errors.requiredCourse")),
    topic: z.string().min(1, t("errors.requiredTopic")),
    points: z.coerce.number().min(1, t("errors.pointsMin")),
    taskDescription: z.string().trim().min(1, t("errors.requiredTaskDescription")),
    rawLatex: z.string().min(1, t("errors.requiredRawLatex")),
  });
