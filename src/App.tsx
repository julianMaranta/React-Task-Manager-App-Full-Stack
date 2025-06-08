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
  const [newTodo, setNewTodo] = useState({
    content: "",
    dueDate: ""
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Omit<Todo, "id" | "createdAt" | "updatedAt">>({
    content: "",
    dueDate: null,
    status: "PENDIENTE"
  });

  // Carga inicial y suscripción a cambios
  useEffect(() => {
    // Primero hacemos una consulta inicial
    const fetchTodos = async () => {
      const { data: initialTodos } = await client.models.Todo.list();
      setTodos(initialTodos as Todo[]);
    };

    fetchTodos();

    // Luego nos suscribimos a los cambios
    const subscription = client.models.Todo.observeQuery().subscribe({
      next: ({ items }) => {
        setTodos(items as Todo[]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Función optimizada para crear tarea
  const handleCreate = async () => {
    if (!newTodo.content.trim()) return;
    
    // Optimistic UI update
    const tempId = Date.now().toString();
    setTodos(prev => [
      ...prev,
      {
        id: tempId,
        content: newTodo.content,
        dueDate: newTodo.dueDate ? new Date(newTodo.dueDate).toISOString() : null,
        status: "PENDIENTE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
    
    try {
      await client.models.Todo.create({
        content: newTodo.content,
        dueDate: newTodo.dueDate ? new Date(newTodo.dueDate).toISOString() : null,
        status: "PENDIENTE"
      });
    } catch (error) {
      // Revertir si hay error
      setTodos(prev => prev.filter(todo => todo.id !== tempId));
      alert("Error al crear la tarea");
    }
    
    setNewTodo({ content: "", dueDate: "" });
  };

  // Función para iniciar edición
  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditData({
      content: todo.content,
      dueDate: todo.dueDate,
      status: todo.status
    });
  };

  // Función para actualizar tarea
  const handleUpdate = async () => {
    if (!editingId) return;
    
    // Optimistic UI update
    setTodos(prev =>
      prev.map(todo =>
        todo.id === editingId
          ? { ...todo, ...editData }
          : todo
      )
    );
    
    try {
      await client.models.Todo.update({
        id: editingId,
        ...editData
      });
      setEditingId(null);
    } catch (error) {
      // Recargar los datos si hay error
      const { data: refreshedTodos } = await client.models.Todo.list();
      setTodos(refreshedTodos as Todo[]);
      alert("Error al actualizar la tarea");
    }
  };

  // Función para eliminar tarea
  const handleDelete = async (id: string) => {
    // Optimistic UI update
    setTodos(prev => prev.filter(todo => todo.id !== id));
    
    try {
      await client.models.Todo.delete({ id });
    } catch (error) {
      // Recargar los datos si hay error
      const { data: refreshedTodos } = await client.models.Todo.list();
      setTodos(refreshedTodos as Todo[]);
      alert("Error al eliminar la tarea");
    }
  };

  // Función para actualizar estado
  const handleStatusChange = async (id: string, status: TodoStatus) => {
    // Optimistic UI update
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, status } : todo
      )
    );
    
    try {
      await client.models.Todo.update({ id, status });
    } catch (error) {
      // Recargar los datos si hay error
      const { data: refreshedTodos } = await client.models.Todo.list();
      setTodos(refreshedTodos as Todo[]);
    }
  };

  // Formateador de fecha
  const formatDate = (dateString: string | null) => {
    return dateString ? new Date(dateString).toLocaleString() : "Sin fecha";
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Gestor de Tareas</h1>
      
      <div style={styles.formContainer}>
        <input
          type="text"
          value={newTodo.content}
          onChange={(e) => setNewTodo({...newTodo, content: e.target.value})}
          placeholder="Nueva tarea"
          style={styles.input}
        />
        <input
          type="datetime-local"
          value={newTodo.dueDate}
          onChange={(e) => setNewTodo({...newTodo, dueDate: e.target.value})}
          style={styles.input}
        />
        <button onClick={handleCreate} style={styles.addButton}>
          Añadir Tarea
        </button>
      </div>

      <ul style={styles.list}>
        {todos.map((todo) => (
          <li 
            key={todo.id} 
            style={{
              ...styles.item,
              backgroundColor: 
                todo.status === "FINALIZADA" ? "#e6ffe6" :
                todo.status === "EN_PROCESO" ? "#fffae6" : "#fff"
            }}
          >
            {editingId === todo.id ? (
              <div style={styles.editForm}>
                <input
                  type="text"
                  value={editData.content}
                  onChange={(e) => setEditData({...editData, content: e.target.value})}
                  style={styles.input}
                />
                <input
                  type="datetime-local"
                  value={editData.dueDate ? editData.dueDate.split('.')[0] : ''}
                  onChange={(e) => setEditData({...editData, dueDate: e.target.value})}
                  style={styles.input}
                />
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({...editData, status: e.target.value as TodoStatus})}
                  style={styles.input}
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROCESO">En Proceso</option>
                  <option value="FINALIZADA">Finalizada</option>
                </select>
                <div style={styles.buttonGroup}>
                  <button onClick={handleUpdate} style={styles.saveButton}>
                    Guardar
                  </button>
                  <button onClick={() => setEditingId(null)} style={styles.cancelButton}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={styles.todoTitle}>{todo.content}</h3>
                <p><strong>Fecha:</strong> {formatDate(todo.dueDate)}</p>
                <p><strong>Estado:</strong> {todo.status}</p>
                <div style={styles.buttonGroup}>
                  <select
                    value={todo.status}
                    onChange={(e) => handleStatusChange(todo.id, e.target.value as TodoStatus)}
                    style={styles.select}
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="FINALIZADA">Finalizada</option>
                  </select>
                  <button 
                    onClick={() => startEditing(todo)} 
                    style={styles.editButton}
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(todo.id)} 
                    style={styles.deleteButton}
                  >
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

// Estilos separados para mejor organización
const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif"
  },
  title: {
    color: "#333",
    textAlign: "center" as const
  },
  formContainer: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap" as const
  },
  input: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    flex: "1",
    minWidth: "200px"
  },
  addButton: {
    padding: "8px 16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  },
  list: {
    listStyle: "none",
    padding: "0",
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px"
  },
  item: {
    padding: "15px",
    borderRadius: "5px",
    border: "1px solid #ddd",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  todoTitle: {
    marginTop: "0",
    color: "#333"
  },
  editForm: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px"
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
    flexWrap: "wrap" as const
  },
  select: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    flex: "1"
  },
  editButton: {
    padding: "8px 16px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    flex: "1"
  },
  deleteButton: {
    padding: "8px 16px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    flex: "1"
  },
  saveButton: {
    padding: "8px 16px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    flex: "1"
  },
  cancelButton: {
    padding: "8px 16px",
    backgroundColor: "#ff9800",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    flex: "1"
  }
};

export default App;