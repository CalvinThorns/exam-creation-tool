import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  shortName: z.string().min(1, "Short name is required"),
  coverPage: z.string().min(1, "Cover page is required"),
});

export const topicSchema = z.object({
  courseId: z.string().min(1, "Course is required"),
  topic: z.string().min(1, "Topic is required"),
  description: z.string().optional(),
  points: z.coerce.number().min(0, "Points must be >= 0"),
  description_img: z.any().optional(),
  tasks: z
    .array(
      z.object({
        question: z.string().min(1, "Question is required"),
        points: z.coerce.number().min(0, "Points must be >= 0"),
        solution: z.string().optional(),
        isRelatedToTopic: z.coerce.boolean().optional(),
        question_img: z.any().optional(),
      }),
    )
    .optional(),
});
