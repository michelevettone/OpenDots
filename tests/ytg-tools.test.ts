import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { listChannels, readState } from '../src/server/ytg-tools.js';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'opendots-ytg-'));
  mkdirSync(join(root, 'channels'));
  writeFileSync(
    join(root, 'channels', 'science.json'),
    JSON.stringify({ name: 'Science', token: 'x' }),
  );
  writeFileSync(
    join(root, 'channels', 'science.daily.json'),
    JSON.stringify({ date: '2026-10-05', slots: 3 }),
  );
  writeFileSync(
    join(root, 'channels', 'science.socials.json'),
    JSON.stringify({ queue: [] }),
  );
  return root;
}

it('lists channels with their state files and excludes state stems', () => {
  const root = fixture();
  try {
    expect(listChannels(root)).toEqual([
      { slug: 'science', files: ['profile', 'daily', 'socials'] },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it('reads one state file and rejects unknown files or unsafe slugs', () => {
  const root = fixture();
  try {
    expect(readState(root, 'science', 'daily')).toEqual({
      file: 'science.daily.json',
      truncated: false,
      content: { date: '2026-10-05', slots: 3 },
    });
    expect(() => readState(root, 'science', 'ledger')).toThrow();
    expect(() => readState(root, '../science', 'daily')).toThrow();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
