import React, { useState, useEffect } from 'react';
import { problemsAPI, categoriesAPI } from '../services/api';
import { toast } from 'react-toastify';
import Map from '../components/Map';
import ProblemCard from '../components/ProblemCard';
import { FiFilter } from 'react-icons/fi';

const demoCategories = [
  { id: 'asfalto', name: 'Asfalto' },
  { id: 'lixo', name: 'Lixo' },
  { id: 'vegetacao', name: 'Vegetação' },
];

const demoProblems = [
  {
    id: 'demo-map-1',
    title: 'Buraco no asfalto',
    description: 'Trecho com risco para veículos e pedestres.',
    address: 'Av. Central, 1200',
    latitude: -15.7797,
    longitude: -47.9297,
    status: 'open',
    votes: 18,
    createdAt: new Date().toISOString(),
    category: demoCategories[0],
    images: [],
  },
  {
    id: 'demo-map-2',
    title: 'Lixo acumulado',
    description: 'Coleta irregular gerando mau cheiro e obstrução.',
    address: 'Rua do Comércio, 48',
    latitude: -15.7868,
    longitude: -47.8841,
    status: 'in_progress',
    votes: 11,
    createdAt: new Date().toISOString(),
    category: demoCategories[1],
    images: [],
  },
  {
    id: 'demo-map-3',
    title: 'Vegetação alta',
    description: 'Crescimento excessivo dificultando a passagem.',
    address: 'Rua Santa Clara, 77',
    latitude: -15.8022,
    longitude: -47.9134,
    status: 'resolved',
    votes: 7,
    createdAt: new Date().toISOString(),
    category: demoCategories[2],
    images: [],
  },
];

const HomePage = () => {
  const [problems, setProblems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('open');
  const [mapProblems, setMapProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [drawingMode, setDrawingMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [problemsRes, categoriesRes] = await Promise.all([
          problemsAPI.list({ status: selectedStatus, category: selectedCategory }),
          categoriesAPI.list(),
        ]);
        const fetchedProblems = problemsRes.data.data || [];
        const fetchedCategories = categoriesRes.data || [];

        setProblems(fetchedProblems.length > 0 ? fetchedProblems : demoProblems);
        setMapProblems(fetchedProblems.length > 0 ? fetchedProblems : demoProblems);
        setSelectedProblem((currentSelected) => currentSelected || fetchedProblems[0] || demoProblems[0] || null);
        setCategories(fetchedCategories.length > 0 ? fetchedCategories : demoCategories);
      } catch (error) {
        setProblems(demoProblems);
        setMapProblems(demoProblems);
        setSelectedProblem(demoProblems[0]);
        setCategories(demoCategories);
        toast.info('Modo demonstração ativado, a API não respondeu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStatus, selectedCategory]);

  const handleAreaComplete = (points) => {
    setSelectedArea(points);
    setDrawingMode(false);
  };

  const statusOptions = [
    { value: 'open', label: 'Abertos' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'resolved', label: 'Resolvidos' },
  ];

  return (
    <div className="min-h-screen bg-[#06070b] text-white">
      {/* Hero Section */}
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.26),transparent_28%),linear-gradient(180deg,rgba(6,7,11,0.98),rgba(6,7,11,0.92))] py-12">
        <div className="container mx-auto px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">Mapa de Problemas</p>
          <h1 className="mt-2 text-4xl font-black text-white">VOZ URBANA</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/70">
            Sua voz melhora a cidade. Reporte problemas urbanos e acompanhe soluções.
          </p>
        </div>
      </section>

      {/* Mapa */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-white">Mapa de Problemas</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDrawingMode((current) => !current)}
              className={`rounded-full border px-5 py-2 text-sm font-bold transition ${drawingMode ? 'border-violet-300 bg-violet-500 text-white' : 'border-white/15 bg-white/6 text-white hover:bg-white/10'}`}
            >
              {drawingMode ? 'Desenhando área...' : 'Selecionar área no mapa'}
            </button>
            {selectedArea && (
              <button
                type="button"
                onClick={() => setSelectedArea(null)}
                className="rounded-full border border-white/15 bg-white/6 px-5 py-2 text-sm font-bold text-white hover:bg-white/10"
              >
                Limpar área
              </button>
            )}
          </div>
        </div>
        <Map
          problems={mapProblems}
          onMarkerClick={setSelectedProblem}
          selectedArea={selectedArea}
          onAreaComplete={handleAreaComplete}
          areaDrawingActive={drawingMode}
          onAreaDrawingToggle={setDrawingMode}
        />
        {selectedArea && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-white/70">
            Área selecionada com {selectedArea.length} pontos.
          </div>
        )}
      </section>

      {/* Filtros */}
      <section className="container mx-auto px-4 py-8">
        <div className="rounded-3xl border border-white/10 bg-white/6 p-6 mb-8 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
            <FiFilter /> Filtros
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">Categoria</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white outline-none"
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
            <p className="text-white/70">Carregando problemas...</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/6 py-12 text-center">
            <p className="text-white/70">Nenhum problema encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        )}

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/6 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-white">Problema selecionado</h2>
            {selectedProblem && (
              <button
                type="button"
                onClick={() => setSelectedProblem(null)}
                className="text-sm font-semibold text-violet-300 hover:underline"
              >
                Limpar seleção
              </button>
            )}
          </div>
          {selectedProblem ? (
            <ProblemCard problem={selectedProblem} />
          ) : (
            <p className="text-white/70">Clique em um marcador do mapa para ver os detalhes aqui.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
