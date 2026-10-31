# @braceml/convert

Converts HTML to [BraceML](https://github.com/pavlovt/braceml).

```js
import { htmlToBraceml } from '@braceml/convert';

htmlToBraceml('<ul class="nav"><li><a href="/">Home</a></li></ul>');
// ul.nav > li > a href=/ 'Home'
```

Pass `classAttribute: true` to keep classes in a `class` attribute, which Tailwind needs.
From the command line, run `npx @braceml/cli convert page.html`.
