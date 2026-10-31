import { useEffect, useState } from 'react';
import { braceml } from '@braceml/react';
import { TodoItem } from './TodoItem.jsx';
import { filters, loadTodos, matches, saveTodos, tip } from './todos.js';

export function App() {
  const [todos, setTodos] = useState(loadTodos);
  const [filter, setFilter] = useState('all');
  const [text, setText] = useState('');

  useEffect(() => saveTodos(todos), [todos]);

  const visible = todos.filter((todo) => matches(todo, filter));
  const remaining = todos.filter((todo) => !todo.done).length;
  const hasDone = remaining < todos.length;

  const add = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos([...todos, { id: crypto.randomUUID(), text: trimmed, done: false }]);
    setText('');
  };
  const toggle = (id) => setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id) => setTodos(todos.filter((t) => t.id !== id));
  const clearDone = () => setTodos(todos.filter((t) => !t.done));

  return braceml`
    main.app {
      h1 'Todos'

      form.new-todo onsubmit={add} {
        input(
          value={text}
          onchange={(e) => setText(e.target.value)}
          placeholder="What needs doing?"
          aria-label="New todo"
        )
        button type=submit disabled={!text.trim()} 'Add'
      }

      ul.todos {
        each visible as todo (todo.id) {
          TodoItem todo={todo} onToggle={toggle} onDelete={remove}
        } else {
          li.todo 'Nothing here'
        }
      }

      .toolbar {
        span '{remaining} left'
        .filters {
          each filters as name (name) {
            button class:selected={name === filter} onclick={() => setFilter(name)} '{name}'
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
  `;
}
