<script>
  let { todo, ontoggle, ondelete } = $props();
</script>

<template lang="braceml">
  li.todo class:done={todo.done} {
    label {
      input type=checkbox checked={todo.done} onchange={() => ontoggle(todo.id)}
      span ' {todo.text}'
    }
    button aria-label="Delete {todo.text}" onclick={() => ondelete(todo.id)} 'Delete'
  }
</template>
