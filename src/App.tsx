import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import "./App.css";

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
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TodoStatus | "TODAS">("TODAS");

  // Carga inicial y suscripción a cambios
  useEffect(() => {
    const fetchTodos = async () => {
      setIsLoading(true);
      try {
        const { data: initialTodos } = await client.models.Todo.list();
        setTodos(initialTodos as Todo[]);
      } catch (error) {
        console.error("Error fetching todos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodos();

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
    if (!dateString) return "Sin fecha";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Filtrar tareas según el estado seleccionado
  const filteredTodos = filter === "TODAS" 
    ? todos 
    : todos.filter(todo => todo.status === filter);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Gestor de Tareas</h1>
        <p className="app-subtitle">Organiza tu día de manera eficiente</p>
      </header>
      
      <div className="todo-form">
        <input
          type="text"
          value={newTodo.content}
          onChange={(e) => setNewTodo({...newTodo, content: e.target.value})}
          placeholder="¿Qué necesitas hacer?"
          className="todo-input"
          onKeyPress={(e) => e.key === "Enter" && handleCreate()}
        />
        <input
          type="datetime-local"
          value={newTodo.dueDate}
          onChange={(e) => setNewTodo({...newTodo, dueDate: e.target.value})}
          className="todo-date-input"
        />
        <button onClick={handleCreate} className="add-button">
          <span className="button-icon">+</span> Añadir Tarea
        </button>
      </div>

      <div className="filter-buttons">
        <button 
          onClick={() => setFilter("TODAS")} 
          className={`filter-button ${filter === "TODAS" ? "active" : ""}`}
        >
          Todas
        </button>
        <button 
          onClick={() => setFilter("PENDIENTE")} 
          className={`filter-button ${filter === "PENDIENTE" ? "active" : ""}`}
        >
          Pendientes
        </button>
        <button 
          onClick={() => setFilter("EN_PROCESO")} 
          className={`filter-button ${filter === "EN_PROCESO" ? "active" : ""}`}
        >
          En Proceso
        </button>
        <button 
          onClick={() => setFilter("FINALIZADA")} 
          className={`filter-button ${filter === "FINALIZADA" ? "active" : ""}`}
        >
          Finalizadas
        </button>
      </div>

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando tareas...</p>
        </div>
      ) : filteredTodos.length === 0 ? (
        <div className="empty-state">
          <img src="https://cdn-icons-png.flaticon.com/512/4076/4076478.png" alt="No tasks" className="empty-image" />
          <p>No hay tareas {filter !== "TODAS" ? `en estado ${filter.toLowerCase()}` : ""}</p>
          <button onClick={() => setFilter("TODAS")} className="primary-button">
            Ver todas las tareas
          </button>
        </div>
      ) : (
        <ul className="todo-list">
          {filteredTodos.map((todo) => (
            <li 
              key={todo.id} 
              className={`todo-item ${todo.status.toLowerCase()} ${editingId === todo.id ? "editing" : ""}`}
            >
              {editingId === todo.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editData.content}
                    onChange={(e) => setEditData({...editData, content: e.target.value})}
                    className="todo-input"
                    autoFocus
                  />
                  <input
                    type="datetime-local"
                    value={editData.dueDate ? editData.dueDate.split('.')[0] : ''}
                    onChange={(e) => setEditData({...editData, dueDate: e.target.value})}
                    className="todo-date-input"
                  />
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({...editData, status: e.target.value as TodoStatus})}
                    className="status-select"
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="FINALIZADA">Finalizada</option>
                  </select>
                  <div className="button-group">
                    <button onClick={handleUpdate} className="save-button">
                      Guardar
                    </button>
                    <button onClick={() => setEditingId(null)} className="cancel-button">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="todo-content">
                  <div className="todo-header">
                    <h3 className="todo-title">{todo.content}</h3>
                    <span className={`status-badge ${todo.status.toLowerCase()}`}>
                      {todo.status.replace("_", " ").toLowerCase()}
                    </span>
                  </div>
                  
                  <div className="todo-details">
                    <p className="due-date">
                      <span className="detail-icon">📅</span>
                      {formatDate(todo.dueDate)}
                    </p>
                    <div className="todo-actions">
                      <select
                        value={todo.status}
                        onChange={(e) => handleStatusChange(todo.id, e.target.value as TodoStatus)}
                        className="status-select"
                      >
                        <option value="PENDIENTE">Pendiente</option>
                        <option value="EN_PROCESO">En Proceso</option>
                        <option value="FINALIZADA">Finalizada</option>
                      </select>
                      <button 
                        onClick={() => startEditing(todo)} 
                        className="edit-button"
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(todo.id)} 
                        className="delete-button"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;