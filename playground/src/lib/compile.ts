import { BraceMLError, format } from '@braceml/core';
import { compileHtml } from '@braceml/html';
import { compileSvelte } from '@braceml/svelte';
import { compileReact } from '@braceml/react/compiler';

export type Target = 'html' | 'svelte' | 'react';

export interface CompileError {
	message: string;
	line?: number;
	column?: number;
	frame?: string;
}

export type CompileResult = { ok: true; code: string } | { ok: false; error: CompileError };

const compilers: Record<Target, (source: string) => string> = {
	html: (source) => compileHtml(source, { filename: 'playground.braceml' }),
	svelte: (source) => compileSvelte(source, { filename: 'playground.braceml' }),
	react: (source) => compileReact(source, { filename: 'playground.braceml' }),
};

function toError(error: unknown): CompileError {
	if (error instanceof BraceMLError) {
		return { message: error.reason, line: error.line, column: error.column, frame: error.frame };
	}
	return { message: error instanceof Error ? error.message : String(error) };
}

export function compile(source: string, target: Target): CompileResult {
	try {
		return { ok: true, code: compilers[target](source) };
	} catch (error) {
		return { ok: false, error: toError(error) };
	}
}

export function formatSource(source: string): CompileResult {
	try {
		return { ok: true, code: format(source) };
	} catch (error) {
		return { ok: false, error: toError(error) };
	}
}

/** Encodes the source for the URL hash, so a link restores it. */
export function encodeSource(source: string): string {
	const bytes = new TextEncoder().encode(source);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSource(encoded: string): string | null {
	try {
		const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
		return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
	} catch {
		return null;
	}
}
