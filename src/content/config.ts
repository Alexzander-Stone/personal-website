import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    highlighted: z.boolean().optional().default(false),
    shortTitle: z.string(),
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string(),
    author: z.string(),
    image: z.object({
      url: z.string(),
      source: z.string(),
      alt: z.string(),
      width: z.object({
        mini: z.number(),
        normal: z.number(),
      }),
      height: z.object({
        mini: z.number(),
        normal: z.number(),
      }),
    }),
    tags: z.array(z.string()),
  }),
});

export const collections = { projects };
