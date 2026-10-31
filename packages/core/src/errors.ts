export interface Position {
  line: number; // 1-based
  column: number; // 1-based
}

export function positionAt(source: string, offset: number): Position {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

export function codeFrame(source: string, offset: number): string {
  const { line, column } = positionAt(source, offset);
  const lines = source.split(/\r?\n/);
  const from = Math.max(1, line - 2);
  const to = Math.min(lines.length, line + 1);
  const width = String(to).length;
  const out: string[] = [];
  for (let n = from; n <= to; n++) {
    const marker = n === line ? '>' : ' ';
    out.push(`${marker} ${String(n).padStart(width)} | ${lines[n - 1] ?? ''}`);
    if (n === line) {
      out.push(`  ${' '.repeat(width)} | ${' '.repeat(column - 1)}^`);
    }
  }
  return out.join('\n');
}

export class BraceMLError extends Error {
  /** the message alone, without the position and code frame */
  readonly reason: string;
  readonly line: number;
  readonly column: number;
  readonly offset: number;
  readonly frame: string;
  readonly filename?: string;

  constructor(message: string, source: string, offset: number, filename?: string) {
    const pos = positionAt(source, offset);
    const frame = codeFrame(source, offset);
    const where = `${filename ? filename + ':' : ''}${pos.line}:${pos.column}`;
    super(`${message} (${where})\n\n${frame}`);
    this.name = 'BraceMLError';
    this.reason = message;
    this.line = pos.line;
    this.column = pos.column;
    this.offset = offset;
    this.frame = frame;
    this.filename = filename;
  }
}
