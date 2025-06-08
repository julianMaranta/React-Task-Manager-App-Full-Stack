import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

type TodoStatus = "PENDIENTE" | "EN_PROCESO" | "FINALIZADA";

type Todo = {
  id: string;
  content: string;
  dueDate: string | null;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
};

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoContent, setNewTodoContent] = useState("");
  const [newTodoDate, setNewTodoDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>>({
    content: "",
    dueDate: null,
    status: "PENDIENTE"
  });

  // Carga inicial y suscripción a cambios en tiempo real
  useEffect(() => {
    const sub = client.models.Todo.observeQuery().subscribe({
      next: ({ items }) => setTodos(items as Todo[])
    });
    return () => sub.unsubscribe();
  }, []);

  // Función optimizada para crear tarea
  const createTodo = async () => {
    if (!newTodoContent.trim()) return;
    
    await client.models.Todo.create({
      content: newTodoContent,
      dueDate: newTodoDate ? new Date(newTodoDate).toISOString() : null,
      status: "PENDIENTE"
    });
    
    setNewTodoContent("");
    setNewTodoDate("");
  };

  // Función optimizada para actualizar tarea
  const updateTodo = async (id: string) => {
    await client.models.Todo.update({
      id,
      ...editForm
    });
    cancelEditing();
  };

  // Función para iniciar edición
  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditForm({
      content: todo.content,
      dueDate: todo.dueDate,
      status: todo.status
    });
  };

  // Función para cancelar edición
  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({
      content: "",
      dueDate: null,
      status: "PENDIENTE"
    });
  };

  // Función para actualizar estado
  const updateStatus = async (id: string, status: TodoStatus) => {
    await client.models.Todo.update({ id, status });
  };

  // Formateador de fecha
  const formatDate = (dateString: string | null) => {
    return dateString ? new Date(dateString).toLocaleString() : "Sin fecha";
  };

  return (
    <div className="container">
      <h1>Gestor de Tareas</h1>
      
      <div className="add-todo-form">
        <input
          type="text"
          value={newTodoContent}
          onChange={(e) => setNewTodoContent(e.target.value)}
          placeholder="Nueva tarea"
        />
        <input
          type="datetime-local"
          value={newTodoDate}
          onChange={(e) => setNewTodoDate(e.target.value)}
        />
        <button onClick={createTodo}>Añadir Tarea</button>
      </div>

      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className={`todo-item ${todo.status.toLowerCase()}`}>
            {editingId === todo.id ? (
              <div className="edit-form">
                <input
                  type="text"
                  value={editForm.content}
                  onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                />
                <input
                  type="datetime-local"
                  value={editForm.dueDate ? editForm.dueDate.split('.')[0] : ''}
                  onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})}
                />
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({...editForm, status: e.target.value as TodoStatus})}
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROCESO">En Proceso</option>
                  <option value="FINALIZADA">Finalizada</option>
                </select>
                <div className="edit-actions">
                  <button onClick={() => updateTodo(todo.id)}>Guardar</button>
                  <button onClick={cancelEditing}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="todo-content">
                <h3>{todo.content}</h3>
                <p><strong>Fecha:</strong> {formatDate(todo.dueDate)}</p>
                <p><strong>Estado:</strong> {todo.status}</p>
                <div className="todo-actions">
                  <select
                    value={todo.status}
                    onChange={(e) => updateStatus(todo.id, e.target.value as TodoStatus)}
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="FINALIZADA">Finalizada</option>
                  </select>
                  <button onClick={() => startEditing(todo)}>Editar</button>
                  <button onClick={() => client.models.Todo.delete({ id: todo.id })}>
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      
    </div>
  );
}

export default App;