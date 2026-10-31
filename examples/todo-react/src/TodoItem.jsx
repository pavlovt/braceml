import { braceml } from '@braceml/react';

export function TodoItem({ todo, onToggle, onDelete }) {
  return braceml`
    li.todo class:done={todo.done} {
      label {
        input type=checkbox checked={todo.done} onchange={() => onToggle(todo.id)}
        span ' {todo.text}'
      }
      button aria-label="Delete {todo.text}" onclick={() => onDelete(todo.id)} 'Delete'
    }
  `;
}
