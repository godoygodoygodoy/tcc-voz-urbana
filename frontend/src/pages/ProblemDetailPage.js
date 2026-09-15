import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { problemsAPI, votesAPI, commentsAPI, mediaUrl } from '../services/api';
import { toast } from 'react-toastify';
import { FiThumbsUp, FiMapPin, FiCalendar, FiUser } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuthStore } from '../store';

const ProblemDetailPage = () => {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        const res = await problemsAPI.get(id);
        setProblem(res.data);
        const commentsRes = await commentsAPI.list(id);
        setComments(commentsRes.data || []);
      } catch (error) {
        toast.error('Erro ao carregar problema');
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [id]);

  const handleVote = async (type) => {
    if (!user) {
      toast.error('Faça login para votar');
      return;
    }

    try {
      setVotingLoading(true);
      const res = await votesAPI.vote(id, { type });
      setProblem(res.data);
      toast.success('Voto registrado!');
    } catch (error) {
      toast.error('Erro ao votar');
    } finally {
      setVotingLoading(false);
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!user) return toast.error('Faça login para comentar');
    if (commentText.trim().length < 2) return toast.error('Escreva um comentário');
    try {
      setCommentLoading(true);
      const response = await commentsAPI.create(id, { texto: commentText });
      setComments((current) => [...current, response.data]);
      setCommentText('');
      toast.success('Comentário publicado');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao publicar comentário');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Problema não encontrado</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-red-100 text-red-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || colors.open;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Imagens */}
          {problem.images?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-gray-100">
              {problem.images.map((img) => (
                <div key={img.id} className="bg-gray-200 rounded-lg overflow-hidden">
                  <img src={mediaUrl(img.url)} alt="Problem" className="w-full h-64 object-cover" />
                  <p className="px-3 py-2 text-xs font-semibold text-gray-600">{img.tipo === 'DEPOIS' ? 'Depois' : 'Antes'}</p>
                </div>
              ))}
            </div>
          )}

          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{problem.title}</h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(problem.status)}`}>
                    {problem.status}
                  </span>
                </div>
                <p className="text-gray-600">{problem.description}</p>
              </div>
            </div>

            {/* Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FiMapPin className="text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">Local</p>
                  <p className="font-semibold">{problem.address || 'Não especificado'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FiUser className="text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">Reportado por</p>
                  <p className="font-semibold">{problem.author?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FiCalendar className="text-purple-600" />
                <div>
                  <p className="text-xs text-gray-600">Data</p>
                  <p className="font-semibold">
                    {formatDistanceToNow(new Date(problem.createdAt), { locale: ptBR, addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>

            {/* Categoria */}
            <div className="mb-6">
              <span
                className="px-4 py-2 rounded-full text-white font-semibold inline-block"
                style={{ backgroundColor: problem.category?.color }}
              >
                {problem.category?.name}
              </span>
            </div>

            {/* Votos */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold mb-4">O que acha dessa denúncia?</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleVote('up')}
                  disabled={votingLoading || !user}
                  className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 disabled:bg-gray-400"
                >
                  <FiThumbsUp /> Apoiar ({problem.votes})
                </button>
              </div>
            </div>

            <section className="mt-8 border-t pt-6">
              <h2 className="text-xl font-bold mb-4">Comentários ({comments.length})</h2>
              <form onSubmit={handleComment} className="flex flex-col gap-3 sm:flex-row">
                <input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Escreva uma atualização ou comentário" className="flex-1 rounded-lg border p-3" maxLength="1000" />
                <button disabled={commentLoading} className="rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-50">Comentar</button>
              </form>
              <div className="mt-5 space-y-4">
                {comments.length === 0 ? <p className="text-gray-500">Ainda não há comentários.</p> : comments.map((comment) => (
                  <article key={comment.id} className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3"><strong>{comment.usuario?.username ? `@${comment.usuario.username}` : comment.usuario?.nome}</strong><span className="text-xs text-gray-500">{formatDistanceToNow(new Date(comment.dataCriacao), { locale: ptBR, addSuffix: true })}</span></div>
                    <p className="mt-2 text-gray-700">{comment.texto}</p>
                  </article>
                ))}
              </div>
            </section>

            {problem.updates?.length > 0 && <section className="mt-8 border-t pt-6">
              <h2 className="text-xl font-bold mb-4">Atualizações</h2>
              <div className="space-y-3">{problem.updates.map((update) => <div key={update.id} className="border-l-4 border-violet-500 bg-violet-50 p-4"><p className="font-semibold">{update.status || 'Atualização'}</p><p className="mt-1 text-gray-700">{update.texto}</p></div>)}</div>
            </section>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
