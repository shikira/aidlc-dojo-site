// content.config.ts — Astro 5 Content Layer collections + strict Zod schemas.
//
// CT-1 units, CT-2 paths, CT-3 questions, CT-4 articles (domain-entities.md).
// version is the frozen three-value enum (NFR-8). All schemas are STRICT — an
// unknown frontmatter/data field is a build error (domain-entities: 未知フィールドを
// 拒否する; the optional-extension seam is a deliberate R2 revision, not a loose
// schema now). Schema violations fail `astro build`, so malformed content can
// never reach a rendered page.
//
// NOTE: this module is the ONLY one that imports `astro:content`, so it is
// excluded from Vitest coverage (see vitest.config.ts). The query/validation
// logic it feeds lives in pure, fully-tested modules under src/lib.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { loadQuestions } from './lib/content/parse';

const version = z.enum(['v1', 'v2', 'common']);

// CT-1 — unit frontmatter (body carries the h2 sections; readingTimeMin derived).
const units = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/units' }),
  schema: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
      version,
    })
    .strict(),
});

// CT-4 — article frontmatter.
const articles = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/articles' }),
  schema: z
    .object({
      title: z.string().min(1),
      // YAML parses an unquoted ISO date as a Date; accept either form and
      // normalize to a YYYY-MM-DD string so authors need not remember to quote.
      date: z
        .union([
          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
          z.date(),
        ])
        .transform((value) =>
          typeof value === 'string' ? value : value.toISOString().slice(0, 10),
        ),
      version,
    })
    .strict(),
});

// CT-2 — one path object per belt file.
const paths = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/paths' }),
  schema: z
    .object({
      belt: z.enum(['white', 'brown', 'black']),
      nameJa: z.string().min(1),
      nameEn: z.string().min(1),
      audience: z.string().min(1),
      unitIds: z.array(z.string().min(1)).min(1),
    })
    .strict(),
});

// CT-3 — questions live in per-belt array files, so a single glob entry-per-file
// would not flatten them. This custom loader reuses the same disk parser the
// `bv` command and tests use, flattening each file's array into one entry per
// question keyed by its id.
const questionsLoader: Loader = {
  name: 'questions-array-loader',
  load: async ({ store, parseData }) => {
    store.clear();
    for (const question of loadQuestions()) {
      const data = await parseData({
        id: question.id,
        data: question as unknown as Record<string, unknown>,
      });
      store.set({ id: question.id, data });
    }
  },
};

const questions = defineCollection({
  loader: questionsLoader,
  schema: z
    .object({
      id: z.string().min(1),
      unitId: z.string().min(1),
      afterSection: z.string().min(1),
      prompt: z.string().min(1),
      choices: z.array(z.string().min(1)).min(2).max(5),
      answerIndex: z.number().int().nonnegative(),
      explanation: z.string().min(1),
      sourceUrl: z
        .string()
        .url()
        .startsWith('https://', 'sourceUrl must be https'),
    })
    .strict(),
});

export const collections = { units, articles, paths, questions };
