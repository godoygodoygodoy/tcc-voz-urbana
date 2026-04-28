import React, { useState, useEffect } from 'react';
import { problemsAPI, categoriesAPI } from '../services/api';
import { toast } from 'react-toastify';
import Map from '../components/Map';
import ProblemCard from '../components/ProblemCard';
import { FiFilter, FiSearch } from 'react-icons/fi';
import { useProblemsStore, useCategoriesStore } from '../store';

const HomePage = () => {
  const [problems, setProblems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [mapProblems, setMapProblems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [problemsRes, categoriesRes] = await Promise.all([
          problemsAPI.list({ status: selectedStatus, category: selectedCategory }),
          categoriesAPI.list(),
        ]);
        setProblems(problemsRes.data.data);
        setMapProblems(problemsRes.data.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        toast.error('Erro ao carregar problemas');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStatus, selectedCategory]);

  const statusOptions = [
    { value: 'open', label: 'Abertos' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'resolved', label: 'Resolvidos' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-purple-800 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">VOZ URBANA</h1>
          <p className="text-lg opacity-90">
            Sua voz melhora a cidade. Reporte problemas urbanos e acompanhe soluções.
          </p>
        </div>
      </section>

      {/* Mapa */}
      <section className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Mapa de Problemas</h2>
        <Map problems={mapProblems} />
      </section>

      {/* Filtros */}
      <section className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FiFilter /> Filtros
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Categoria</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full border rounded-lg p-2"
              >
                <option value="">Todas as categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grid de Problemas */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando problemas...</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600">Nenhum problema encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;
