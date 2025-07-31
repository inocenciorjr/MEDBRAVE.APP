import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../../services/fetchWithAuth";
import { formatDate } from "../../utils/dateUtils";

interface AdminTask {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const AdminTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth("/api/admin/tasks"); // Endpoint para listar tarefas administrativas
        if (!res.ok) throw new Error("Erro ao buscar tarefas administrativas");
        const json = await res.json();
        setTasks(json.data || []);
      } catch (err: any) {
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchTasks();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tarefas Administrativas</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-indigo-700 transition">Nova Tarefa</button>
      </div>
      {loading && <div className="text-gray-500 py-6">Carregando tarefas...</div>}
      {error && <div className="text-red-500 py-6">{error}</div>}
      {!loading && !error && (
        <table className="min-w-full bg-white rounded-xl shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Título</th>
              <th className="px-4 py-2 text-left">Descrição</th>
              <th className="px-4 py-2 text-left">Responsável</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Prioridade</th>
              <th className="px-4 py-2 text-left">Vencimento</th>
              <th className="px-4 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b">
                <td className="px-4 py-2 font-semibold">{task.title}</td>
                <td className="px-4 py-2">{task.description || '-'}</td>
                <td className="px-4 py-2">{task.assignedTo || '-'}</td>
                <td className="px-4 py-2 capitalize">{task.status}</td>
                <td className="px-4 py-2 capitalize">{task.priority}</td>
                <td className="px-4 py-2">{task.dueDate ? formatDate(task.dueDate) : '-'}</td>
                <td className="px-4 py-2">
                  {/* Botões de ação (placeholders) */}
                  <button className="text-blue-600 hover:underline mr-2">Editar</button>
                  <button className="text-green-600 hover:underline mr-2">Concluir</button>
                  <button className="text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminTasksPage;