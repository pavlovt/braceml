# @braceml/html

Compile [BraceML](https://github.com/pavlovt/braceml) to plain HTML.

```js
import { compileHtml } from "@braceml/html";

compileHtml(".row > .col 'Hello'");
// <div class="row">\n  <div class="col">Hello</div>\n</div>
```

Vue and Angular attribute syntax (`@click`, `:prop`, `(click)`, `[prop]`) passes through unchanged.
