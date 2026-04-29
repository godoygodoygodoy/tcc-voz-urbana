import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FiBarChart2, FiCheckCircle, FiAlertCircle, FiUsers, FiTag } from 'react-icons/fi';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminAPI.getStats();
        setStats(res.data);
      } catch (error) {
        toast.error('Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06070b] py-8 text-white">
      <div className="container mx-auto px-4">
        <h1 className="mb-8 text-3xl font-black">Painel Administrativo</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            icon={FiBarChart2}
            title="Total de Problemas"
            value={stats?.totalProblems || 0}
            color="bg-violet-500"
          />
          <StatCard
            icon={FiAlertCircle}
            title="Abertos"
            value={stats?.openProblems || 0}
            color="bg-violet-700"
          />
          <StatCard
            icon={FiCheckCircle}
            title="Resolvidos"
            value={stats?.resolvedProblems || 0}
            color="bg-violet-400"
          />
          <StatCard
            icon={FiUsers}
            title="Usuários"
            value={stats?.totalUsers || 0}
            color="bg-violet-600"
          />
          <StatCard
            icon={FiTag}
            title="Categorias"
            value={stats?.totalCategories || 0}
            color="bg-violet-800"
          />
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-white/6 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <h2 className="text-2xl font-bold mb-4">Resumo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border-l-4 border-violet-500">
              <p className="text-white/55 text-sm">Problemas a Resolver</p>
              <p className="text-2xl font-bold text-violet-300">{stats?.openProblems || 0}</p>
            </div>
            <div className="p-4 border-l-4 border-violet-400">
              <p className="text-white/55 text-sm">Em Andamento</p>
              <p className="text-2xl font-bold text-violet-300">0</p>
            </div>
            <div className="p-4 border-l-4 border-violet-700">
              <p className="text-white/55 text-sm">Resolvidos</p>
              <p className="text-2xl font-bold text-violet-300">{stats?.resolvedProblems || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
