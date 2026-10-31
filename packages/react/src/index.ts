import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Marks a BraceML template in a .jsx or .tsx file. The Vite plugin from
 * `@braceml/react/vite` compiles it away, so this only runs without the plugin.
 *
 * ```tsx
 * return braceml`p 'Hello {name}'`;
 * ```
 */
export function braceml(_strings: TemplateStringsArray, ..._values: never[]): ReactNode {
  throw new Error("BraceML template wasn't compiled. Add braceml() from '@braceml/react/vite' to your Vite config.");
}

export interface AwaitProps<T> {
  promise: T | PromiseLike<T>;
  pending?: ReactNode;
  resolved?: (value: T) => ReactNode;
  rejected?: (error: unknown) => ReactNode;
}

type AwaitState<T> =
  | { promise: unknown; status: 'pending' }
  | { promise: unknown; status: 'resolved'; value: T }
  | { promise: unknown; status: 'rejected'; error: unknown };

/** Renders an `await` block. The compiler generates this component. */
export function Await<T>({ promise, pending = null, resolved, rejected }: AwaitProps<T>): ReactNode {
  const [state, setState] = useState<AwaitState<T>>({ promise, status: 'pending' });

  useEffect(() => {
    let current = true;
    setState({ promise, status: 'pending' });
    Promise.resolve(promise).then(
      (value) => {
        if (current) setState({ promise, status: 'resolved', value });
      },
      (error: unknown) => {
        if (current) setState({ promise, status: 'rejected', error });
      },
    );
    return () => {
      current = false;
    };
  }, [promise]);

  // a state left over from the previous promise is still pending for this one
  if (state.promise !== promise || state.status === 'pending') return pending;
  if (state.status === 'resolved') return resolved ? resolved(state.value) : null;
  return rejected ? rejected(state.error) : null;
}
