import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../../services/fetchWithAuth";
import { formatDateTime } from "../../utils/dateUtils";

interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth("/api/payments"); // Endpoint para listar pagamentos
        if (!res.ok) throw new Error("Erro ao buscar pagamentos");
        const json = await res.json();
        setPayments(json.data || []);
      } catch (err: any) {
        setError(err.message || "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        {/* Placeholders para filtros */}
        <div className="flex gap-2">
          <input className="border rounded px-2 py-1" placeholder="Filtrar por status" />
          <input className="border rounded px-2 py-1" placeholder="Filtrar por método" />
          <input className="border rounded px-2 py-1" placeholder="Filtrar por usuário" />
          <input className="border rounded px-2 py-1" placeholder="Filtrar por data" type="date" />
        </div>
      </div>
      {loading && <div className="text-gray-500 py-6">Carregando pagamentos...</div>}
      {error && <div className="text-red-500 py-6">{error}</div>}
      {!loading && !error && (
        <table className="min-w-full bg-white rounded-xl shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Usuário</th>
              <th className="px-4 py-2 text-left">Valor</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Método</th>
              <th className="px-4 py-2 text-left">Data</th>
              <th className="px-4 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b">
                <td className="px-4 py-2 font-mono">{payment.id}</td>
                <td className="px-4 py-2">{payment.userId}</td>
                <td className="px-4 py-2">{payment.amount.toLocaleString(undefined, { style: 'currency', currency: payment.currency })}</td>
                <td className="px-4 py-2 capitalize">{payment.status}</td>
                <td className="px-4 py-2 capitalize">{payment.paymentMethod}</td>
                <td className="px-4 py-2">{formatDateTime(payment.createdAt)}</td>
                <td className="px-4 py-2">
                  {/* Botões de ação (placeholders) */}
                  <button className="text-green-600 hover:underline mr-2">Aprovar</button>
                  <button className="text-red-600 hover:underline mr-2">Rejeitar</button>
                  <button className="text-yellow-600 hover:underline mr-2">Reembolsar</button>
                  <button className="text-gray-600 hover:underline mr-2">Cancelar</button>
                  <button className="text-blue-600 hover:underline">Detalhes</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPaymentsPage;