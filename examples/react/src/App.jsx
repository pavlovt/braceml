import { useMemo, useState } from 'react';
import { braceml } from '@braceml/react';

const loadFact = () => new Promise((resolve) => setTimeout(() => resolve('BraceML compiles to JSX'), 300));

export function App() {
  const [todos, setTodos] = useState([{ id: 1, text: 'Try BraceML', done: false }]);
  const [text, setText] = useState('');
  const fact = useMemo(loadFact, []);

  const add = (e) => {
    e.preventDefault();
    setTodos([...todos, { id: Date.now(), text, done: false }]);
    setText('');
  };
  const toggle = (id) => setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  return braceml`
    main style="max-width: 30rem; margin: 2rem auto" {
      h1 'Todos'

      form onsubmit={add} {
        input value={text} onchange={(e) => setText(e.target.value)} placeholder="New todo"
        button type=submit disabled={!text} 'Add'
      }

      ul {
        each todos as todo (todo.id) {
          li style:opacity={todo.done ? 0.5 : 1} {
            label {
              input type=checkbox checked={todo.done} onchange={() => toggle(todo.id)}
              ' {todo.text}'
            }
          }
        } else {
          li 'Nothing to do'
        }
      }

      await fact {
        p 'Loading…'
      } then value {
        p > em '{value}'
      }
    }
  `;
}
