import { z } from "zod";

export const sourceRangeSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    excerpt: z.string().min(1),
  })
  .refine(({ start, end }) => start < end, {
    message: "Range end must be greater than start",
    path: ["end"],
  });

export const detectedTopicSchema = z
  .object({
    id: z.string().regex(/^topic-[1-5]$/),
    title: z.string().min(1),
    summary: z.string().min(1),
    ranges: z.array(sourceRangeSchema).min(1).max(6),
  })
  .refine(
    ({ ranges }) => ranges.reduce((total, range) => total + range.excerpt.length, 0) <= 4_000,
    { message: "Quoted source must not exceed 4,000 characters", path: ["ranges"] },
  );

export const topicDetectionSchema = z
  .object({
    transcriptHash: z.string().regex(/^[a-f0-9]{64}$/),
    topics: z.array(detectedTopicSchema).min(1).max(5),
  })
  .superRefine(({ topics }, context) => {
    if (new Set(topics.map(({ id }) => id)).size !== topics.length) {
      context.addIssue({
        code: "custom",
        message: "Topic IDs must be unique",
        path: ["topics"],
      });
    }
  });

export type SourceRange = z.infer<typeof sourceRangeSchema>;
export type DetectedTopic = z.infer<typeof detectedTopicSchema>;
export type TopicDetection = z.infer<typeof topicDetectionSchema>;
