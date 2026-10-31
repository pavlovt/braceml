<script>
  import TodoItem from './TodoItem.svelte';
  import { filters, loadTodos, matches, saveTodos, tip } from './todos.js';

  let todos = $state(loadTodos());
  let filter = $state('all');
  let text = $state('');

  $effect(() => saveTodos(todos));

  let visible = $derived(todos.filter((todo) => matches(todo, filter)));
  let remaining = $derived(todos.filter((todo) => !todo.done).length);
  let hasDone = $derived(remaining < todos.length);

  function add(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    todos.push({ id: crypto.randomUUID(), text: trimmed, done: false });
    text = '';
  }
  function toggle(id) {
    const todo = todos.find((t) => t.id === id);
    todo.done = !todo.done;
  }
  function remove(id) {
    todos = todos.filter((t) => t.id !== id);
  }
  function clearDone() {
    todos = todos.filter((t) => !t.done);
  }
</script>

<template lang="braceml">
  main.app {
    h1 'Todos'

    form.new-todo onsubmit={add} {
      input(
        bind:value={text}
        placeholder="What needs doing?"
        aria-label="New todo"
      )
      button type=submit disabled={!text.trim()} 'Add'
    }

    ul.todos {
      each visible as todo (todo.id) {
        TodoItem todo={todo} ontoggle={toggle} ondelete={remove}
      } else {
        li.todo 'Nothing here'
      }
    }

    .toolbar {
      span '{remaining} left'
      .filters {
        each filters as name (name) {
          button class:selected={name === filter} onclick={() => filter = name} '{name}'
        }
      }
      if hasDone {
        button onclick={clearDone} 'Clear done'
      }
    }

    await tip {
      p.tip 'Loading a tip…'
    } then value {
      p.tip '{value}'
    }
  }
</template>
