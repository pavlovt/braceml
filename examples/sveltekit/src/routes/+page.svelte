<script lang="ts">
  import UserRow from '$lib/UserRow.svelte';

  let users = $state([
    { id: 1, name: 'Ana', done: false },
    { id: 2, name: 'Boris', done: true },
  ]);
  let name = $state('');
  let nextId = 3;

  function add(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    users.push({ id: nextId++, name: name.trim(), done: false });
    name = '';
  }
</script>

<template lang="braceml">
  svelte:head > title 'BraceML + SvelteKit'

  main.container {
    h1 'BraceML + SvelteKit'

    form onsubmit={add} {
      input placeholder="New name" bind:value={name}
      button type=submit disabled={!name.trim()} 'Add'
    }

    if users.length == 0 {
      p.muted 'Nobody here yet.'
    } else {
      p '{users.filter((u) => u.done).length} of {users.length} done'
      ul {
        each users as user, i (user.id) {
          UserRow user={user} onremove={() => users.splice(i, 1)}
        }
      }
    }
  }
</template>

<style>
  .container { font-family: system-ui, sans-serif; max-width: 32rem; margin: 2rem auto; }
  .muted { color: #888; }
</style>
