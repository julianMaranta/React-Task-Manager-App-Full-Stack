import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

type Todo = {
  id: string;
  content: string;
  dueDate: string | null;
  status: "PENDIENTE" | "EN_PROCESO" | "FINALIZADA";
  createdAt: string;
  updatedAt: string;
};

type EditingTodo = {
  id: string;
  content: string;
  dueDate: string | null;
  status: "PENDIENTE" | "EN_PROCESO" | "FINALIZADA";
};

function App() {
  const [todos, setTodos] = useState<Array<Todo>>([]);
  const [newTodoContent, setNewTodoContent] = useState("");
  const [newTodoDate, setNewTodoDate] = useState("");
  const [editingTodo, setEditingTodo] = useState<EditingTodo | null>(null);

  useEffect(() => {
    const subscription = client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos(data.items as Todo[]),
    });

    return () => subscription.unsubscribe();
  }, []);

  async function createTodo() {
    if (!newTodoContent.trim()) return;
    
    await client.models.Todo.create({
      content: newTodoContent,
      dueDate: newTodoDate ? new Date(newTodoDate).toISOString() : null,
      status: "PENDIENTE"
    });
    
    setNewTodoContent("");
    setNewTodoDate("");
  }

  async function deleteTodo(id: string) {
    await client.models.Todo.delete({ id });
  }

  function startEditing(todo: Todo) {
    setEditingTodo({
      id: todo.id,
      content: todo.content,
      dueDate: todo.dueDate,
      status: todo.status
    });
  }

  async function updateTodo() {
    if (!editingTodo) return;
    
    await client.models.Todo.update({
      id: editingTodo.id,
      content: editingTodo.content,
      dueDate: editingTodo.dueDate,
      status: editingTodo.status
    });
    
    setEditingTodo(null);
  }

  async function updateTodoStatus(todo: Todo, newStatus: "PENDIENTE" | "EN_PROCESO" | "FINALIZADA") {
    await client.models.Todo.update({
      id: todo.id,
      status: newStatus
    });
  }

  function formatDateTime(datetime: string | null) {
    if (!datetime) return "Sin fecha";
    return new Date(datetime).toLocaleString();
  }

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>Mis Tareas</h1>
      
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="text"
          value={newTodoContent}
          onChange={(e) => setNewTodoContent(e.target.value)}
          placeholder="Nueva tarea"
          style={{ padding: "8px", flex: "1" }}
        />
        <input
          type="datetime-local"
          value={newTodoDate}
          onChange={(e) => setNewTodoDate(e.target.value)}
          style={{ padding: "8px" }}
        />
        <button 
          onClick={createTodo} 
          style={{ padding: "8px 16px", backgroundColor: "#4CAF50", color: "white", border: "none" }}
        >
          + Añadir
        </button>
      </div>
      
      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map((todo) => (
          <li 
            key={todo.id}
            style={{ 
              marginBottom: "10px", 
              padding: "15px", 
              border: "1px solid #ddd", 
              borderRadius: "5px",
              backgroundColor: 
                todo.status === "FINALIZADA" ? "#e6ffe6" : 
                todo.status === "EN_PROCESO" ? "#fffae6" : "#fff"
            }}
          >
            {editingTodo?.id === todo.id ? (
              <div>
                <input
                  type="text"
                  value={editingTodo.content}
                  onChange={(e) => setEditingTodo({...editingTodo, content: e.target.value})}
                  style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
                />
                <input
                  type="datetime-local"
                  value={editingTodo.dueDate ? editingTodo.dueDate.split('.')[0] : ""}
                  onChange={(e) => setEditingTodo({...editingTodo, dueDate: e.target.value})}
                  style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
                />
                <select
                  value={editingTodo.status}
                  onChange={(e) => setEditingTodo({
                    ...editingTodo, 
                    status: e.target.value as "PENDIENTE" | "EN_PROCESO" | "FINALIZADA"
                  })}
                  style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROCESO">En Proceso</option>
                  <option value="FINALIZADA">Finalizada</option>
                </select>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button 
                    onClick={updateTodo}
                    style={{ 
                      padding: "8px 16px", 
                      backgroundColor: "#4CAF50", 
                      color: "white", 
                      border: "none",
                      flex: 1
                    }}
                  >
                    Guardar
                  </button>
                  <button 
                    onClick={() => setEditingTodo(null)}
                    style={{ 
                      padding: "8px 16px", 
                      backgroundColor: "#f44336", 
                      color: "white", 
                      border: "none",
                      flex: 1
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ marginTop: 0 }}>{todo.content}</h3>
                <p><strong>Fecha límite:</strong> {formatDateTime(todo.dueDate)}</p>
                <p><strong>Estado:</strong> {todo.status}</p>
                
                <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                  <select
                    value={todo.status}
                    onChange={(e) => updateTodoStatus(todo, e.target.value as "PENDIENTE" | "EN_PROCESO" | "FINALIZADA")}
                    style={{ padding: "8px", flex: 1 }}
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="FINALIZADA">Finalizada</option>
                  </select>
                  
                  <button 
                    onClick={() => startEditing(todo)}
                    style={{ 
                      padding: "8px 16px", 
                      backgroundColor: "#2196F3", 
                      color: "white", 
                      border: "none",
                      flex: 1
                    }}
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => deleteTodo(todo.id)}
                    style={{ 
                      padding: "8px 16px", 
                      backgroundColor: "#f44336", 
                      color: "white", 
                      border: "none",
                      flex: 1
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;