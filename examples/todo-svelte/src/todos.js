const KEY = 'braceml-todos';

export const filters = ['all', 'active', 'done'];

export function matches(todo, filter) {
  if (filter === 'active') return !todo.done;
  if (filter === 'done') return todo.done;
  return true;
}

export function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? [];
  } catch {
    return [];
  }
}

export function saveTodos(todos) {
  localStorage.setItem(KEY, JSON.stringify(todos));
}

export const tip = new Promise((resolve) => {
  setTimeout(() => resolve('Tip: this page is written in BraceML.'), 500);
});
