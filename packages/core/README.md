# @braceml/core

Parser, AST and error reporting for [BraceML](https://github.com/pavlovt/braceml).

```js
import { parse, BraceMLError } from "@braceml/core";

const ast = parse(".row { p 'Hello' }");
```

Errors are `BraceMLError` instances with `line`, `column` and a `frame` (code excerpt).
