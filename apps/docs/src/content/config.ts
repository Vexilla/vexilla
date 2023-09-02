import { z, defineCollection } from "astro:content";
import { tomlKey, tomlKeys } from "@/types/docs";

const blogPostSchema = z.object({
  title: z.string(),
  publishDate: z.coerce.date(),
  description: z.string(),
});

export type BlogPost = z.infer<typeof blogPostSchema>;

const blogCollection = defineCollection({
  type: "content",
  schema: blogPostSchema,
});

const documentationCollection = defineCollection({
  type: "content",
});

const guidesCollection = defineCollection({
  type: "content",
});

const snippetCollection = defineCollection({
  type: "data",
  schema: z.object(
    tomlKeys.reduce((acc, key) => {
      return {
        ...acc,
        [key as tomlKey]: z.string().optional(),
      };
    }, {} as Record<tomlKey, z.ZodString>)
  ),
});

export const collections = {
  blog: blogCollection,
  documentation: documentationCollection,
  snippets: snippetCollection,
  guides: guidesCollection,
};
