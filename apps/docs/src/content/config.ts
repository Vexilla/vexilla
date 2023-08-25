import { z, defineCollection } from "astro:content";
import { tomlKey, tomlKeys } from "@/types/docs";

const blogCollection = defineCollection({
  type: "content",
});

const documentationCollection = defineCollection({
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
};
