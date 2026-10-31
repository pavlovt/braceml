# @braceml/react

Write React components with [BraceML](https://github.com/pavlovt/braceml) templates.

```tsx
import { braceml } from '@braceml/react';

export function Users({ users }) {
  return braceml`
    ul {
      each users as user (user.id) {
        li '{user.name}'
      }
    }
  `;
}
```

See the [React guide](https://github.com/pavlovt/braceml/blob/main/docs/react.md).
