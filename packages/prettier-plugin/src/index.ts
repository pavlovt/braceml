import { format } from '@braceml/core';
import { doc } from 'prettier';
import type { Parser, Plugin, Printer, SupportLanguage } from 'prettier';

interface Root {
  type: 'root';
  source: string;
}

export const languages: SupportLanguage[] = [
  { name: 'BraceML', parsers: ['braceml'], extensions: ['.braceml'], vscodeLanguageIds: ['braceml'] },
];

export const parsers: Record<string, Parser<Root>> = {
  braceml: {
    astFormat: 'braceml',
    parse: (source) => ({ type: 'root', source }),
    locStart: () => 0,
    locEnd: (root) => root.source.length,
  },
};

export const printers: Record<string, Printer<Root>> = {
  braceml: {
    print(path, options) {
      const output = format(path.node.source, {
        filename: options.filepath,
        indent: options.useTabs ? '\t' : ' '.repeat(options.tabWidth),
        printWidth: options.printWidth,
      });
      const { join, literalline } = doc.builders;
      // literal lines: the formatter has already indented everything
      return join(literalline, output.split('\n'));
    },
  },
};

const plugin: Plugin<Root> = { languages, parsers, printers };
export default plugin;
