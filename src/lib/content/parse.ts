// parse.ts — build-time content loading from disk (fs + `yaml`).
//
// This is the single reader used by the `bv` command, the tests, and the custom
// Astro loader for `questions` (content.config.ts). It reads the SAME source
// files Astro's content collections read, so "run BV over the real collections"
// (business-rules) means exactly the on-disk source tree. Pure Node — no
// `astro:content` — so it runs under Vitest and as a standalone script.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Article, PathDef, Question, RawCollections, Unit } from './types';

/** Default content root, relative to the repo. */
export const CONTENT_ROOT = 'src/content';

/**
 * Split a Markdown file into its YAML frontmatter object and its body.
 * Frontmatter is the block between the first pair of `---` fences. A file with
 * no frontmatter yields `{ data: {}, body: <whole file> }`.
 */
export function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    return { data: {}, body: raw };
  }
  const data = (parseYaml(match[1] ?? '') as Record<string, unknown>) ?? {};
  return { data, body: match[2] ?? '' };
}

/** List files with the given extension in a directory (empty if absent). */
function listFiles(dir: string, ext: string): string[] {
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(ext))
      .sort();
  } catch {
    return [];
  }
}

/** Strip a file extension from a basename to derive an entry id/slug. */
function basename(file: string, ext: string): string {
  return file.slice(0, -ext.length);
}

/** Load `units/*.md` into `Unit[]` (id from frontmatter, falling back to filename). */
export function loadUnits(root = CONTENT_ROOT): Unit[] {
  const dir = join(root, 'units');
  return listFiles(dir, '.md').map((file) => {
    const { data, body } = parseFrontmatter(
      readFileSync(join(dir, file), 'utf8'),
    );
    return {
      id: String(data.id ?? basename(file, '.md')),
      title: String(data.title ?? ''),
      version: data.version as Unit['version'],
      body,
    };
  });
}

/** Load `articles/*.md` into `Article[]` (slug from filename). */
export function loadArticles(root = CONTENT_ROOT): Article[] {
  const dir = join(root, 'articles');
  return listFiles(dir, '.md').map((file) => {
    const { data, body } = parseFrontmatter(
      readFileSync(join(dir, file), 'utf8'),
    );
    return {
      slug: basename(file, '.md'),
      title: String(data.title ?? ''),
      date: String(data.date ?? ''),
      version: data.version as Article['version'],
      body,
    };
  });
}

/** Load `paths/*.yaml` into `PathDef[]` (one object per file). */
export function loadPaths(root = CONTENT_ROOT): PathDef[] {
  const dir = join(root, 'paths');
  return listFiles(dir, '.yaml').map((file) => {
    const data = parseYaml(readFileSync(join(dir, file), 'utf8')) as PathDef;
    return data;
  });
}

/** Load `questions/*.yaml` into a flat `Question[]` (each file holds an array). */
export function loadQuestions(root = CONTENT_ROOT): Question[] {
  const dir = join(root, 'questions');
  const out: Question[] = [];
  for (const file of listFiles(dir, '.yaml')) {
    const data = parseYaml(readFileSync(join(dir, file), 'utf8')) as Question[];
    if (Array.isArray(data)) {
      out.push(...data);
    }
  }
  return out;
}

/** Load all four collections from a content root. */
export function loadCollections(root = CONTENT_ROOT): RawCollections {
  return {
    units: loadUnits(root),
    paths: loadPaths(root),
    questions: loadQuestions(root),
    articles: loadArticles(root),
  };
}
