import { z, defineCollection } from "astro:content";
import { type tomlKey, tomlKeys } from "@/types/docs";

// export type BlogPost = z.infer<typeof blogPostSchema>;

const blogCollection = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      publishDate: z.coerce.date(),
      description: z.string(),
      coverImage: image().refine((img) => img.width >= 1080, {
        message: "Cover image must be at least 1080 pixels wide!",
      }),
    }),
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
    tomlKeys.reduce(
      (acc, key) => {
        return {
          ...acc,
          [key as tomlKey]: z.string().optional(),
        };
      },
      {} as Record<tomlKey, z.ZodString>,
    ),
  ),
});

export const collections = {
  blog: blogCollection,
  documentation: documentationCollection,
  snippets: snippetCollection,
  guides: guidesCollection,
};
