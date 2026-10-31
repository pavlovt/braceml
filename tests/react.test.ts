import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformSync } from 'esbuild';
import { describe, expect, it } from 'vitest';
import { Await, braceml } from '@braceml/react';
import { compileJsx } from '@braceml/react/compiler';
import { transformBraceML } from '@braceml/react/vite';

/** Compiles a template and renders it with `scope` as its variables. */
function render(source: string, scope: Record<string, unknown> = {}): string {
  const { code } = compileJsx(source, { names: { Await: 'Await' } });
  const js = transformSync(`const output = (${code});`, {
    loader: 'jsx',
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
  }).code;
  const names = ['createElement', 'Fragment', 'Await', ...Object.keys(scope)];
  const fn = new Function(...names, `${js}
return output;`);
  return renderToStaticMarkup(fn(createElement, Fragment, Await, ...Object.values(scope)));
}

describe('react output', () => {
  it('renders attributes the way React expects', () => {
    expect(render(`label.a for=x class="b {c}" 'Hi'`, { c: 'd' })).toBe('<label class="a b d" for="x">Hi</label>');
    expect(render(`p style="color: red" style:width="{w}px" 'x'`, { w: 3 })).toBe('<p style="color:red;width:3px">x</p>');
    expect(render(`a href="/u/{id}" 'x'`, { id: 7 })).toBe('<a href="/u/7">x</a>');
  });

  it('keeps a falsy class out of className', () => {
    expect(render(`p.a class:on={on} class={extra} 'x'`, { on: false, extra: undefined })).toBe('<p class="a">x</p>');
  });

  it('renders blocks', () => {
    const list = `ul { each xs as x (x) { li '{x}' } else { li 'None' } }`;
    expect(render(list, { xs: [1, 2] })).toBe('<ul><li>1</li><li>2</li></ul>');
    expect(render(list, { xs: [] })).toBe('<ul><li>None</li></ul>');
    expect(render(`if a { p 'A' } else if b { p 'B' }`, { a: false, b: false })).toBe('');
    expect(render(`if a { p 'A' } else { p 'B' }`, { a: 0 })).toBe('<p>B</p>');
  });

  it('declares snippets and @const', () => {
    const source = `
      snippet cell(v) {
        td '{v}'
      }
      @const n = 1 + 1
      table > tbody > tr { @render cell(n) }
    `;
    expect(render(source)).toBe('<table><tbody><tr><td>2</td></tr></tbody></table>');
  });

  it('passes snippets to components as props', () => {
    const Box = ({ title, children }: { title: (t: string) => unknown; children: unknown }) =>
      createElement('div', null, title('T') as never, children as never);
    const source = `
      Box {
        snippet title(t) {
          h1 '{t}'
        }
        p 'Body'
      }
    `;
    expect(render(source, { Box })).toBe('<div><h1>T</h1><p>Body</p></div>');
  });

  it('renders children as a value', () => {
    expect(render(`section { @render children?.() }`, { children: 'x' })).toBe('<section>x</section>');
  });

  it('keeps explicit spaces around text', () => {
    expect(render(`p {\n  'Hello '\n  strong 'you'\n  ' there'\n}`)).toBe('<p>Hello <strong>you</strong> there</p>');
  });

  it('sets @html on the parent', () => {
    expect(render(`div { @html raw }`, { raw: '<b>x</b>' })).toBe('<div><b>x</b></div>');
  });
});

describe('vite plugin', () => {
  const file = '/src/App.tsx';

  it('replaces the template and adds helper imports', () => {
    const code = [
      `import { braceml } from '@braceml/react';`,
      `// braceml\`not me\``,
      `export const App = ({ xs }: { xs: string[] }) => braceml\``,
      `  each xs as x (x) {`,
      `    p '{x}'`,
      "    p '\\`done\\`'",
      `  }`,
      `\`;`,
    ].join('\n');
    const out = transformBraceML(code, file)!.code;
    expect(out).toContain('xs.map((x) =>');
    expect(out).toContain('<p>`done`</p>');
    expect(out).toContain('// braceml`not me`');
    expect(out).toContain(`import { Fragment as __BraceML_Fragment } from 'react';`);
    expect(() => transformSync(out, { loader: 'tsx' })).not.toThrow();
  });

  it('follows an import alias and leaves other tags alone', () => {
    const code = `import { braceml as t } from '@braceml/react';\nconst a = t\`p 'x'\`;\nconst b = braceml\`p 'y'\`;`;
    const out = transformBraceML(code, '/a.jsx')!.code;
    expect(out).toContain('<p>x</p>');
    expect(out).toContain("braceml`p 'y'`");
  });

  it('skips files without the import', () => {
    expect(transformBraceML('const a = braceml`p`;', file)).toBeNull();
  });

  it('reports errors at the line in the source file', () => {
    const code = `import { braceml } from '@braceml/react';\n\nconst a = braceml\`\n  p {x}\n\`;`;
    expect(() => transformBraceML(code, file)).toThrow(`${file}:4`);
  });

  it('rejects ${} holes', () => {
    const code = 'import { braceml } from "@braceml/react";\nconst a = braceml`p ${x}`;';
    expect(() => transformBraceML(code, file)).toThrow('Use {expression}');
  });
});

it('the tag throws when the plugin is missing', () => {
  expect(() => braceml`p 'x'`).toThrow("wasn't compiled");
});
