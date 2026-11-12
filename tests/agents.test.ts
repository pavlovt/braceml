import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { updateAgents } from '../packages/cli/src/agents.js';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('updateAgents', () => {
  const marked = '<!-- braceml:start -->\nREF\n<!-- braceml:end -->\n';

  it('creates the section when there is no AGENTS.md', () => {
    expect(updateAgents(undefined, 'REF\n')).toBe(marked);
  });

  it('appends the section after existing instructions', () => {
    expect(updateAgents('# Rules\n\n- Use pnpm.\n', 'REF')).toBe(`# Rules\n\n- Use pnpm.\n\n${marked}`);
  });

  it('replaces only the marked section', () => {
    const file = `# Rules\n\n<!-- braceml:start -->\nOLD\n<!-- braceml:end -->\n\n## More\n`;
    expect(updateAgents(file, 'REF')).toBe(`# Rules\n\n${marked}\n## More\n`);
  });

  it('is idempotent', () => {
    const once = updateAgents('# Rules\n', 'REF');
    expect(updateAgents(once, 'REF')).toBe(once);
  });
});

it('AGENTS.md has the current docs/llms.txt (run `pnpm agents:update`)', () => {
  const agents = read('AGENTS.md').replace(/\r\n/g, '\n');
  const reference = read('docs/llms.txt').replace(/\r\n/g, '\n');
  expect(updateAgents(agents, reference)).toBe(agents);
});
