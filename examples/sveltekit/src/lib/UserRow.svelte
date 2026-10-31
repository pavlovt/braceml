<script lang="ts">
  let { user, onremove }: { user: { id: number; name: string; done: boolean }; onremove: () => void } = $props();
</script>

<template lang="braceml">
  li class:done={user.done} {
    label {
      input type=checkbox bind:checked={user.done}
      ' {user.name}'
    }
    button.remove onclick={onremove} aria-label="Remove {user.name}" '×'
  }
</template>

<style>
  .done { text-decoration: line-through; opacity: 0.6; }
  .remove { margin-left: 0.5rem; }
</style>
