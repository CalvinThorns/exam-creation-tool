import { z } from "zod";

export const courseSchema = (t) =>
  z.object({
    title: z.string().min(1, t("errors.requiredTitle")),
    shortName: z.string().min(1, t("errors.requiredShortName")),
    coverPage: z.string().min(1, t("errors.requiredCoverPage")),
  });

export const topicSchema = (t) =>
  z.object({
    courseId: z.string().min(1, t("errors.requiredCourse")),
    topic: z.string().min(1, t("errors.requiredTopic")),
    description: z.string().optional(),
    points: z.coerce.number().min(0, t("errors.pointsMin")),
    description_img: z.any().optional(),
    tasks: z
      .array(
        z.object({
          question: z.string().min(1, t("errors.requiredQuestion")),
          points: z.coerce.number().min(0, t("errors.pointsMin")),
          solution: z.string().optional(),
          isRelatedToTopic: z.coerce.boolean().optional(),
          question_img: z.any().optional(),
        }),
      )
      .optional(),
  });
