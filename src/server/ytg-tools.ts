import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineTool } from '@copilotkit/runtime/v2';
import { z } from 'zod';

export const YTG_KINDS = [
  'profile',
  'daily',
  'ledger',
  'stats',
  'socials',
  'analytics',
  'junk',
  'prompts',
  'done',
  'pool_history',
] as const;

const MAX_CHARS = 60_000;

export function listChannels(root: string) {
  const dir = join(root, 'channels');
  if (!existsSync(dir)) throw new Error(`No channels directory at ${dir}.`);
  const stateSuffix = new RegExp(`\\.(${YTG_KINDS.join('|')})\\.json$`);
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json') && !stateSuffix.test(file))
    .map((file) => {
      const slug = file.replace(/\.json$/, '');
      return {
        slug,
        files: YTG_KINDS.filter((kind) =>
          existsSync(
            join(
              dir,
              kind === 'profile' ? `${slug}.json` : `${slug}.${kind}.json`,
            ),
          ),
        ),
      };
    });
}

export function readState(
  root: string,
  slug: string,
  kind: (typeof YTG_KINDS)[number],
) {
  if (!/^[a-z0-9._-]+$/i.test(slug))
    throw new Error('Invalid channel slug: use letters, digits, dot, dash.');
  const file =
    kind === 'profile' ? `${slug}.json` : `${slug}.${kind}.json`;
  const path = join(root, 'channels', file);
  if (!existsSync(path))
    throw new Error(`No ${file} in the pipeline's channels directory.`);
  const raw = readFileSync(path, 'utf8');
  if (raw.length > MAX_CHARS)
    return { file, truncated: true, content: raw.slice(0, MAX_CHARS) };
  return { file, truncated: false, content: JSON.parse(raw) as unknown };
}

export function ytgTools(root: string) {
  return [
    defineTool({
      name: 'list_shorts_channels',
      description:
        'List the channels of the local YouTube Shorts pipeline (yt-short-generator) and which state files exist for each: daily scheduling state, ledger of used episodes, published-video stats, cross-post queue, analytics series, profiles, or prompt pools.',
      parameters: z.object({}),
      execute: async () => listChannels(root),
    }),
    defineTool({
      name: 'read_shorts_state',
      description:
        'Read one state file of the local YouTube Shorts pipeline (read-only). Use it to answer what is scheduled, published, failed, or already queued for cross-posting. Kinds: profile, daily, ledger, stats, socials, analytics, junk, prompts, done, pool_history.',
      parameters: z.object({
        slug: z.string().describe('Channel slug, for example science or tech.'),
        kind: z.enum(YTG_KINDS),
      }),
      execute: async ({ slug, kind }) => readState(root, slug, kind),
    }),
  ];
}
