export interface Example {
	id: string;
	source: string;
}

/** Playground examples. Titles live in messages/*.json as example_<id>. */
export const examples: Example[] = [
	{
		id: 'hello',
		source: `// Text is always quoted
main.page {
  h1 'Hello, BraceML'
  p {
    'No closing tags, and '
    strong 'text is always quoted'
    '.'
  }
  ul.links {
    li > a href=https://github.com/pavlovt/braceml 'Source on GitHub'
    li > a href=https://www.npmjs.com/org/braceml 'Packages on npm'
  }
}
`,
	},
	{
		id: 'form',
		source: `form#signup.card action=/signup method=post {
  label for=email 'Email'
  input#email type=email name=email required
  label {
    input type=checkbox name=news
    ' Send me the newsletter'
  }
  button.btn.primary type=submit 'Sign up'
}
`,
	},
	{
		id: 'tailwind',
		source: `// Tailwind classes go in a class attribute
article class="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-lg md:max-w-md" {
  h2 class="text-lg font-semibold text-slate-900" 'Tailwind card'
  p class="mt-2 text-sm text-slate-500" 'Classes such as w-1.5 need the attribute form.'
  a(
    class="mt-4 inline-flex rounded-md bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700"
    href="#"
  ) 'Read more'
}
`,
	},
	{
		id: 'blocks',
		source: `// Blocks compile to Svelte and React, not to plain HTML
if user {
  p 'Hello {user.name}'
} else {
  button onclick={login} 'Log in'
}

ul {
  each items as item, i (item.id) {
    li '{i + 1}. {item.name}'
  } else {
    li.empty 'Nothing yet'
  }
}

await promise {
  p 'Loading…'
} then data {
  p '{data.title}'
} catch error {
  p.error '{error.message}'
}
`,
	},
	{
		id: 'snippets',
		source: `snippet row(user) {
  tr {
    td '{user.name}'
    td '{user.email}'
  }
}

table {
  tbody {
    each users as user (user.id) {
      @render row(user)
    }
  }
}
`,
	},
];
