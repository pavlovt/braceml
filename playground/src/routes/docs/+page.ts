import { Marked } from 'marked';
import source from '../../../../docs/language.md?raw';
import type { PageLoad } from './$types';

const repo = 'https://github.com/pavlovt/braceml/blob/main/docs/';

function slug(text: string): string {
	return text
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');
}

export const load: PageLoad = () => {
	const toc: { id: string; text: string; depth: number }[] = [];
	const marked = new Marked({
		renderer: {
			heading({ tokens, depth, text }) {
				const id = slug(text);
				if (depth === 2 || depth === 3) toc.push({ id, text, depth });
				return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
			},
			link({ href, tokens }) {
				// links in language.md are relative to docs/ in the repo
				const url = /^(https?:|#|mailto:)/.test(href) ? href : new URL(href, repo).href;
				return `<a href="${url}">${this.parser.parseInline(tokens)}</a>`;
			},
		},
	});
	const html = marked.parse(source, { async: false });
	return { html, toc };
};
