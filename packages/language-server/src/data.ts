/** Completion and hover content. */

export const SVELTE_ELEMENTS = ['body', 'boundary', 'document', 'element', 'head', 'options', 'self', 'window'].map(
  (name) => `svelte:${name}`,
);

export interface Keyword {
  label: string;
  snippet: string;
  /** shown on hover */
  doc: string;
}

export const BLOCKS: Keyword[] = [
  {
    label: 'if',
    snippet: 'if ${1:condition} {\n\t$0\n}',
    doc: 'Renders its children when the condition is true.\n\n```braceml\nif a { } else if b { } else { }\n```\n\nSvelte: `{#if a}…{:else if b}…{:else}…{/if}`',
  },
  {
    label: 'each',
    snippet: 'each ${1:items} as ${2:item} (${3:$2.id}) {\n\t$0\n}',
    doc: 'Renders its children once per item. An `else` block runs when the list is empty.\n\n```braceml\neach items as item, i (item.id) { } else { }\n```\n\nSvelte: `{#each items as item, i (item.id)}…{/each}`',
  },
  {
    label: 'await',
    snippet: 'await ${1:promise} {\n\t$2\n} then ${3:value} {\n\t$0\n}',
    doc: 'Renders different children while a promise is pending, resolved or rejected.\n\n```braceml\nawait promise { } then value { } catch error { }\n```\n\nSvelte: `{#await promise}…{:then value}…{:catch error}…{/await}`',
  },
  {
    label: 'key',
    snippet: 'key ${1:value} {\n\t$0\n}',
    doc: 'Destroys and recreates its children when the value changes.\n\n```braceml\nkey value { }\n```\n\nSvelte: `{#key value}…{/key}`',
  },
  {
    label: 'snippet',
    snippet: 'snippet ${1:name}(${2:args}) {\n\t$0\n}',
    doc: 'Declares reusable markup. Render it with `@render`.\n\n```braceml\nsnippet row(user) { }\n```\n\nSvelte: `{#snippet row(user)}…{/snippet}`',
  },
];

export const CONTINUATIONS: Record<string, string> = {
  else: 'Runs when the `if` conditions are false, or when an `each` list is empty.',
  then: 'Runs when the `await` promise resolves.\n\nSvelte: `{:then value}`',
  catch: 'Runs when the `await` promise rejects.\n\nSvelte: `{:catch error}`',
};

export const SPECIALS: Keyword[] = [
  {
    label: 'render',
    snippet: 'render ${1:name}($2)',
    doc: 'Renders a snippet. Runs to the end of the line.\n\nSvelte: `{@render name(args)}`',
  },
  {
    label: 'html',
    snippet: 'html ${1:raw}',
    doc: 'Inserts raw HTML without escaping. Runs to the end of the line.\n\nSvelte: `{@html raw}`',
  },
  {
    label: 'const',
    snippet: 'const ${1:name} = ${2:value}',
    doc: 'Declares a constant inside a block. Runs to the end of the line.\n\nSvelte: `{@const name = value}`',
  },
  {
    label: 'debug',
    snippet: 'debug ${1:value}',
    doc: 'Logs a value when it changes. Runs to the end of the line.\n\nSvelte: `{@debug value}`',
  },
];

export const GLOBAL_ATTRIBUTES = ['class', 'id', 'style', 'title', 'role', 'tabindex', 'hidden', 'lang', 'dir', 'aria-label', 'aria-hidden'];

export const TAG_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'target', 'rel', 'download'],
  audio: ['src', 'controls', 'autoplay', 'loop', 'muted'],
  button: ['type', 'disabled', 'name', 'value'],
  form: ['action', 'method', 'enctype', 'novalidate'],
  iframe: ['src', 'title', 'width', 'height', 'loading'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  input: ['type', 'name', 'value', 'placeholder', 'required', 'disabled', 'readonly', 'checked', 'min', 'max', 'step', 'pattern', 'autocomplete'],
  label: ['for'],
  link: ['rel', 'href', 'as'],
  meta: ['name', 'content', 'charset', 'property'],
  option: ['value', 'selected', 'disabled'],
  script: ['src', 'type', 'async', 'defer'],
  select: ['name', 'required', 'disabled', 'multiple'],
  td: ['colspan', 'rowspan'],
  textarea: ['name', 'placeholder', 'rows', 'cols', 'required', 'disabled', 'readonly'],
  th: ['colspan', 'rowspan', 'scope'],
  video: ['src', 'poster', 'controls', 'autoplay', 'loop', 'muted', 'width', 'height'],
};

export const BOOLEAN_ATTRIBUTES = new Set(['async', 'autoplay', 'checked', 'controls', 'defer', 'disabled', 'download', 'hidden', 'loop', 'multiple', 'muted', 'novalidate', 'readonly', 'required', 'selected']);

export const EVENTS = ['onclick', 'oninput', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup', 'onfocus', 'onblur', 'onmouseenter', 'onmouseleave'];

export const DIRECTIVES: { label: string; snippet: string }[] = [
  { label: 'bind:value', snippet: 'bind:value={$1}' },
  { label: 'bind:checked', snippet: 'bind:checked={$1}' },
  { label: 'bind:this', snippet: 'bind:this={$1}' },
  { label: 'class:', snippet: 'class:${1:name}={$2}' },
  { label: 'style:', snippet: 'style:${1:property}={$2}' },
  { label: 'use:', snippet: 'use:${1:action}' },
  { label: 'transition:', snippet: 'transition:${1:name}' },
];

export const ATTRIBUTE_VALUES: Record<string, string[]> = {
  'a.target': ['_blank', '_self', '_parent', '_top'],
  'button.type': ['button', 'submit', 'reset'],
  'form.method': ['GET', 'POST', 'dialog'],
  'iframe.loading': ['lazy', 'eager'],
  'img.loading': ['lazy', 'eager'],
  'input.type': ['text', 'email', 'password', 'number', 'search', 'tel', 'url', 'checkbox', 'radio', 'date', 'time', 'file', 'hidden', 'range', 'color', 'submit'],
};
