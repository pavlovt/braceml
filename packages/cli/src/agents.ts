const START = '<!-- braceml:start -->';
const END = '<!-- braceml:end -->';

/**
 * Puts the BraceML reference into an AGENTS.md file (https://agents.md/) between
 * marker comments. Replaces the marked section if there is one, else appends it.
 */
export function updateAgents(existing: string | undefined, reference: string): string {
  const section = `${START}\n${reference.trim()}\n${END}\n`;
  if (!existing?.trim()) return section;
  const start = existing.indexOf(START);
  const end = existing.indexOf(END);
  if (start !== -1 && end > start) {
    const after = existing.slice(end + END.length).replace(/^\r?\n/, '');
    return existing.slice(0, start) + section + after;
  }
  return `${existing.trimEnd()}\n\n${section}`;
}
