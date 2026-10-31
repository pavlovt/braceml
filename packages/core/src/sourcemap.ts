export interface SourceMap {
  version: 3;
  sources: string[];
  sourcesContent: string[];
  names: string[];
  mappings: string;
}

export interface LineOffsets {
  code: string;
  /** for each line of code, the source offset it came from */
  offsets: (number | null)[];
}

/** Part of a generated file: a range of the source copied as is, or generated code. */
export type MappedPiece = { start: number; end: number } | { code: string; offsets: (number | null)[] };

const MARK = '\0';
const MARKED = /^\0(\d+)\0/;

/** Tags lines with the offset of the node that printed them. Inner nodes keep their own tag. */
export function markLines(lines: string[], offset: number): string[] {
  return lines.map((line) => (line.startsWith(MARK) ? line : `${MARK}${offset}${MARK}${line}`));
}

/** Removes the tags from markLines. A line without one belongs to the line above it. */
export function extractLineOffsets(marked: string): LineOffsets {
  const offsets: (number | null)[] = [];
  const lines = marked.split('\n').map((line) => {
    const tag = MARKED.exec(line);
    offsets.push(tag ? Number(tag[1]) : (offsets.at(-1) ?? null));
    return tag ? line.slice(tag[0].length) : line;
  });
  return { code: lines.join('\n'), offsets };
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function vlq(value: number): string {
  let rest = value < 0 ? (-value << 1) | 1 : value << 1;
  let out = '';
  do {
    const digit = rest & 31;
    rest >>>= 5;
    out += BASE64[rest > 0 ? digit | 32 : digit];
  } while (rest > 0);
  return out;
}

function lineStarts(source: string): number[] {
  const starts = [0];
  for (let i = source.indexOf('\n'); i !== -1; i = source.indexOf('\n', i + 1)) starts.push(i + 1);
  return starts;
}

function lineOf(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return low;
}

/**
 * Joins pieces into one file and builds a source map for it. Each generated line
 * maps to the start of the node it came from, which is enough for stack traces,
 * compiler errors and breakpoints.
 */
export function joinWithMap(
  source: string,
  pieces: MappedPiece[],
  filename = 'source',
): { code: string; map: SourceMap } {
  const generated: ({ column: number; offset: number } | null)[] = [null];
  let code = '';
  let atLineStart = true;

  const nextLine = () => {
    generated.push(null);
    atLineStart = true;
  };

  for (const piece of pieces) {
    if ('code' in piece) {
      piece.code.split('\n').forEach((line, i) => {
        if (i > 0) nextLine();
        const offset = piece.offsets[i] ?? null;
        if (atLineStart && offset !== null) {
          generated[generated.length - 1] = { column: line.length - line.trimStart().length, offset };
        }
        if (line) atLineStart = false;
      });
      code += piece.code;
      continue;
    }
    let at = piece.start;
    while (at < piece.end) {
      const newline = source.indexOf('\n', at);
      const end = newline === -1 || newline >= piece.end ? piece.end : newline + 1;
      if (atLineStart) generated[generated.length - 1] = { column: 0, offset: at };
      atLineStart = false;
      if (source[end - 1] === '\n') nextLine();
      at = end;
    }
    code += source.slice(piece.start, piece.end);
  }

  const starts = lineStarts(source);
  let lastLine = 0;
  let lastColumn = 0;
  const mappings = generated
    .map((mapping) => {
      if (!mapping) return '';
      const line = lineOf(starts, mapping.offset);
      const column = mapping.offset - starts[line];
      const segment = vlq(mapping.column) + vlq(0) + vlq(line - lastLine) + vlq(column - lastColumn);
      lastLine = line;
      lastColumn = column;
      return segment;
    })
    .join(';');

  return { code, map: { version: 3, sources: [filename], sourcesContent: [source], names: [], mappings } };
}
