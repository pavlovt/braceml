// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { Await } from '@braceml/react';

it('Await shows the pending, resolved and rejected states', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const props = {
    pending: 'wait',
    resolved: (v: string) => `ok ${v}`,
    rejected: (e: unknown) => `bad ${(e as Error).message}`,
  };
  const show = (promise: Promise<string>) => createElement(Await<string>, { ...props, promise });

  const host = document.createElement('div');
  const root = createRoot(host);
  await act(async () => root.render(show(Promise.resolve('a'))));
  expect(host.textContent).toBe('ok a');

  await act(async () => root.render(show(Promise.reject(new Error('b')))));
  expect(host.textContent).toBe('bad b');

  await act(async () => root.render(show(new Promise<string>(() => {}))));
  expect(host.textContent).toBe('wait');
});
