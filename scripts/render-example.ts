/**
 * Renders docs/images/example.braceml as SVG, using the VS Code grammar, for the
 * top of the README. GitHub has no BraceML grammar, so a code block can't show
 * these colors.
 *   pnpm readme:image
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import oniguruma from 'vscode-oniguruma';
import vsctm from 'vscode-textmate';

const require = createRequire(import.meta.url);
const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

interface Theme {
  background: string;
  border: string;
  text: string;
  keyword: string;
  tag: string;
  attribute: string;
  selector: string;
  string: string;
  component: string;
  variable: string;
  comment: string;
}

const THEMES: Record<string, Theme> = {
  dark: {
    background: '#161b22',
    border: '#30363d',
    text: '#d4d4d4',
    keyword: '#c586c0',
    tag: '#569cd6',
    attribute: '#9cdcfe',
    selector: '#d7ba7d',
    string: '#ce9178',
    component: '#4ec9b0',
    variable: '#9cdcfe',
    comment: '#6a9955',
  },
  light: {
    background: '#f6f8fa',
    border: '#d0d7de',
    text: '#24292f',
    keyword: '#af00db',
    tag: '#0550ae',
    attribute: '#953800',
    selector: '#116329',
    string: '#a31515',
    component: '#267f99',
    variable: '#001080',
    comment: '#6e7781',
  },
};

function colorKey(scopes: string[]): keyof Theme {
  const scope = scopes.at(-1)!;
  if (scope.startsWith('comment')) return 'comment';
  if (scope.startsWith('string')) return 'string';
  if (scope.startsWith('keyword')) return 'keyword';
  if (scope.startsWith('entity.name.tag')) return 'tag';
  if (scope.startsWith('support.class.component')) return 'component';
  if (/attribute-name\.(class|id)/.test(scope)) return 'selector';
  if (scope.startsWith('entity.other.attribute-name')) return 'attribute';
  if (scope.startsWith('meta.embedded.expression')) return 'variable';
  return 'text';
}

async function tokenize(source: string) {
  await oniguruma.loadWASM(readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer);
  const grammarPath = path('../editors/vscode/syntaxes/braceml.tmLanguage.json');
  const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (s: string[]) => new oniguruma.OnigScanner(s),
      createOnigString: (s: string) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scope: string) => {
      if (scope === 'source.braceml') return vsctm.parseRawGrammar(readFileSync(grammarPath, 'utf8'), grammarPath);
      if (scope === 'source.js') return vsctm.parseRawGrammar(JSON.stringify({ scopeName: 'source.js', patterns: [] }), 'js.json');
      return null;
    },
  });
  const grammar = (await registry.loadGrammar('source.braceml'))!;
  let state = vsctm.INITIAL;
  return source.trimEnd().split('\n').map((line) => {
    const { tokens, ruleStack } = grammar.tokenizeLine(line, state);
    state = ruleStack;
    return tokens.map((t) => ({ text: line.slice(t.startIndex, t.endIndex), key: colorKey(t.scopes) }));
  });
}

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render(lines: Awaited<ReturnType<typeof tokenize>>, theme: Theme): string {
  const fontSize = 14;
  const lineHeight = 22;
  const padding = 20;
  const columns = Math.max(...lines.map((l) => l.reduce((n, t) => n + t.text.length, 0)));
  const width = Math.ceil(columns * fontSize * 0.62) + padding * 2;
  const height = lines.length * lineHeight + padding * 2;

  const text = lines
    .map((tokens, i) => {
      const spans = tokens.map((t) => `<tspan fill="${theme[t.key]}">${escapeXml(t.text)}</tspan>`).join('');
      return `  <text x="${padding}" y="${padding + (i + 1) * lineHeight - 6}" xml:space="preserve">${spans}</text>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="A BraceML template with syntax highlighting">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" fill="${theme.background}" stroke="${theme.border}"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${fontSize}">
${text}
  </g>
</svg>
`;
}

const lines = await tokenize(readFileSync(path('../docs/images/example.braceml'), 'utf8'));
for (const [name, theme] of Object.entries(THEMES)) {
  writeFileSync(path(`../docs/images/example-${name}.svg`), render(lines, theme));
}
console.log('images updated');
