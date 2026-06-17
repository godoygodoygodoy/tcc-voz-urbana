import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { problemsAPI, categoriesAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store';
import { FiMapPin, FiType } from 'react-icons/fi';

const ReportProblemPage = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    categoryId: '',
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesAPI.list();
        setCategories(res.data);
      } catch (error) {
        toast.error('Erro ao carregar categorias');
      } finally {
        setLoadingCategories(false);
      }
    };

    // Obter localização atual
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }));
        },
        (error) => console.log('Erro ao obter localização:', error)
      );
    }

    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(files);

    const nextPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews(nextPreviews);
  };

  const removeImage = (index) => {
    const nextImages = images.filter((_, i) => i !== index);
    setImages(nextImages);
    const nextPreviews = nextImages.map((f) => URL.createObjectURL(f));
    setPreviews(nextPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.categoryId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      if (formData.address) payload.append('address', formData.address);
      payload.append('latitude', parseFloat(formData.latitude));
      payload.append('longitude', parseFloat(formData.longitude));
      payload.append('categoryId', formData.categoryId);

      images.forEach((file) => payload.append('images', file));

      await problemsAPI.create(payload);
      toast.success('Problema reportado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao reportar problema');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-2">Reportar Problema</h1>
          <p className="text-gray-600 mb-8">Ajude a melhorar a cidade reportando um problema urbano</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Categoria *</label>
              {loadingCategories ? (
                <p className="text-gray-600">Carregando categorias...</p>
              ) : (
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg p-3"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Título do Problema *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-3"
                placeholder="Ex: Buraco na rua principal"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Descrição Detalhada *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="w-full border rounded-lg p-3"
                rows="5"
                placeholder="Descreva o problema em detalhes..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Endereço</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                placeholder="Rua, número, bairro..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Imagens (opcional)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                className="w-full"
              />

              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {previews.map((src, idx) => (
                    <div key={src} className="relative">
                      <img src={src} alt={`preview-${idx}`} className="w-full h-24 object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Latitude</label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  step="0.000001"
                  className="w-full border rounded-lg p-3"
                  placeholder="Ex: -15.7942"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Longitude</label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  step="0.000001"
                  className="w-full border rounded-lg p-3"
                  placeholder="Ex: -47.8822"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? 'Reportando...' : 'Reportar Problema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportProblemPage;
