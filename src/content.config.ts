import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const seo = z
  .object({
    title: z.string().max(70).optional(),
    description: z.string().max(170).optional(),
    keyword: z.string().optional(),
    ogImage: z.string().optional(),
    canonical: z.string().optional(),
    noindex: z.boolean().default(false),
  })
  .default({ noindex: false });

const sticker = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sticker' }),
  schema: z.object({
    name: z.string(),
    kurz: z.string(),
    typ: z.enum(['einzel', 'gross', 'auto', 'pack']),
    kategorie: z.enum(['klassiker', 'huetteldorf', 'wien', 'gross', 'auto', 'packs']),
    preis: z.number(),
    wertEinzeln: z.number().optional(),
    stueck: z.number().default(1),
    format: z.string(),
    bild: z.string(),
    bildPng: z.string().optional(),
    bestseller: z.boolean().default(false),
    verfuegbar: z.boolean().default(true),
    sku: z.string(),
    reihenfolge: z.number().default(10),
    shopifyVariantId: z.string().optional(),
    seo,
  }),
});

const seiten = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/seiten' }),
  schema: z.object({ titel: z.string(), seo }),
});

export const collections = { sticker, seiten };
