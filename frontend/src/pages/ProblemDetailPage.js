import {notifySocialChange} from '../utils/social';
const SharePublicationButton = React.lazy(() => import('../components/SharePublicationButton'));
const PinControl = React.lazy(() => import('../components/PinControl'));
const ProblemTrackingPanel = React.lazy(() => import('../components/ProblemTrackingPanel'));
const ComparisonPanel = React.lazy(() => import('../components/ComparisonPanel'));
const WatchControl = React.lazy(() => import('../components/WatchControl'));
import CommentThread from '../components/CommentThread';
const PollPanel = React.lazy(() => import('../components/PollPanel'));
import { shallow } from 'zustand/shallow';
import { translate as tr, translateSystemText, translateStatus, translateCategory, getLanguage, useI18n } from '../i18n';
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { problemsAPI, votesAPI, commentsAPI, mediaUrl } from '../services/api';
import Avatar from '../components/Avatar';
import { toast } from '../components/LocalizedToast';
import { FiThumbsUp, FiMapPin, FiCalendar, FiUser } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useAuthStore } from '../store';

import { profilePath } from '../utils/profileLinks';

const ProblemDetailPage = () => {

  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingLoading, setVotingLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(1);
  const [commentTotal, setCommentTotal] = useState(0);
  const [moreComments, setMoreComments] = useState(false);
  const commentOwner = React.useRef(id);
  commentOwner.current = id;
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const { user, openAuthModal } = useAuthStore(state => ({ user: state.user, openAuthModal: state.openAuthModal }), shallow);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    setComments([]); setCommentPage(1); setCommentTotal(0); setMoreComments(false);
    const controller = new AbortController();
    let active = true;
    const fetchProblem = async () => {
      try {
        setLoading(true);
        const commentsRequest = commentsAPI.list(id, { signal: controller.signal, params: { paginated: true, page: 1 } }).then(response => { if (active) { setComments(response.data?.data || response.data || []); setMoreComments(Boolean(response.data?.hasMore)); setCommentTotal(response.data?.commentTotal ?? response.data?.total ?? response.data?.length ?? 0); } }).catch(() => {});
        const res = await problemsAPI.get(id, { signal: controller.signal });
        if (active) setProblem(res.data);
        // Comments load concurrently and do not delay the main publication.
        void commentsRequest;
      } catch (error) {
        if (active) toast.error(tr('problemNotFound'));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProblem();
    return () => { active = false; controller.abort(); };
  }, [id]);

  const loadMoreComments = async () => {
    if (commentLoading) return;
    setCommentLoading(true);
    try {
      const response = await commentsAPI.list(id, { params: { paginated: true, page: commentPage + 1 } });
      if (commentOwner.current !== id) return;
      const rows = response.data?.data || [];
      setComments(current => { const ids = new Set(current.map(item => item.id)); return [...current, ...rows.filter(item => !ids.has(item.id))]; });
      setCommentPage(current => current + 1); setMoreComments(Boolean(response.data?.hasMore)); setCommentTotal(response.data?.commentTotal ?? response.data?.total ?? 0);
    } catch { toast.error(tr('apiUnavailable')); }
    finally { if (commentOwner.current === id) setCommentLoading(false); }
  };
  const handleReplyCreated = useCallback((id,total) => {
    setComments(current=>current.map(comment=>comment.id===id?{...comment,replyCount:total}:comment));setCommentTotal(current=>current+1);notifySocialChange();
  },[]);
  const handleVote = async (type) => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    try {
      setVotingLoading(true);
      const res = await votesAPI.vote(id, { type });
      setProblem(res.data);
      toast.success(t('voteRegistered'));
    } catch (error) {
      toast.error(t('reportError'));
    } finally {
      setVotingLoading(false);
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (commentText.trim().length < 2) return toast.error(t('writeComment'));
    try {
      setCommentLoading(true);
      const response = await commentsAPI.create(id, { texto: commentText });
      setComments((current) => [...current, response.data]);
      setCommentTotal(current => current + 1);
      setCommentText('');
      notifySocialChange();toast.success(t('commentPublished'));
    } catch (error) {
      toast.error(error.response?.data?.error || t("Erro ao publicar comentário"));
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="site-page min-h-screen flex items-center justify-center text-white">
        <p className="site-muted">{t('loading')}</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="site-page min-h-screen flex items-center justify-center text-white">
        <p className="site-muted">{t('problemNotFound')}</p>
      </div>
    );
  }

  const refreshProblem = async () => { try { setProblem((await problemsAPI.get(id)).data); } catch { toast.error(tr('apiUnavailable')); } };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-violet-900 text-violet-100',
      in_progress: 'bg-violet-700 text-white',
      resolved: 'bg-violet-600 text-white',
      closed: 'bg-zinc-700 text-white',
    };
    return colors[status] || colors.open;
  };

  return (
    <div className="site-page min-h-screen py-8 text-white">
      <div className="container mx-auto px-4">
        <button type="button" onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold hover:bg-white/10">{t("← Voltar")}</button>
        <div className="site-detail overflow-hidden rounded-3xl shadow-md">
          {/* Imagens */}
          {problem.images?.length > 0 && (
            <div className="site-detail-gallery grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              {problem.images.map((img) => (
                <div key={img.id} className="site-detail-image rounded-lg overflow-hidden">
                  <img src={mediaUrl(img.url)} alt={problem.title} className="w-full h-64 object-cover" />
                  <p className="site-muted px-3 py-2 text-xs font-semibold">{img.tipo === 'DEPOIS' ? t('after') : t('before')}</p>
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
                    {problem.etapa ? problem.etapa.nome || t('workflow'+problem.etapa.codigo) : translateStatus(problem.status)}
                  </span>
                </div>
                <p className="site-muted">{problem.description}</p>
              </div>
            </div>

            {/* Info */}
            <div className="site-detail-info grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <FiMapPin className="text-purple-600" />
                <div>
                  <p className="site-muted text-xs">{t('address')}</p>
                  <p className="font-semibold text-white">{problem.address || t('locationNotSpecified')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FiUser className="text-purple-600" />
                <div>
                  <p className="site-muted text-xs">{t('reportedBy')}</p>
                  <Link to={profilePath(problem.author)} className="flex items-center gap-2"><Avatar user={problem.author} className="h-8 w-8" /><p className="font-semibold text-white">{problem.author?.name}</p></Link>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FiCalendar className="text-purple-600" />
                <div>
                  <p className="site-muted text-xs">{t('date')}</p>
                  <p className="font-semibold text-white">
                    {formatDistanceToNow(new Date(problem.createdAt), { locale: ({ 'pt-BR': ptBR, en: enUS, es })[getLanguage()], addSuffix: true })}
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
                {translateCategory(problem.category?.name)}
              </span>
            </div>

            <React.Suspense fallback={null}><SharePublicationButton problemId={id}/><PinControl problem={problem}/><ComparisonPanel problem={problem} onChange={refreshProblem}/><ProblemTrackingPanel problemId={id}/></React.Suspense>
            {/* Votos */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-bold mb-4">{t('whatDoYouThink')}</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleVote('up')}
                  disabled={votingLoading || !user}
                  className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 disabled:bg-gray-400"
                >
                  <FiThumbsUp /> {t('support')} ({problem.votes})
                </button>
              </div>
            </div>

            <React.Suspense fallback={null}><WatchControl problemId={id}/></React.Suspense>
            <React.Suspense fallback={null}><PollPanel problem={problem}/></React.Suspense>
            <section id="comments" className="mt-8 border-t border-white/10 pt-6">
              <h2 className="text-xl font-bold mb-4">{t('comments')} ({commentTotal})</h2>
              <form onSubmit={handleComment} className="flex flex-col gap-3 sm:flex-row">
                <input aria-label={t('writeComment')} value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder={t('writeComment')} className="site-form-input flex-1 rounded-lg border p-3" maxLength="1000" />
                <button disabled={commentLoading} className="rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{t('comment')}</button>
              </form>
              <div className="mt-5 space-y-4">
                {comments.length === 0 ? <p className="site-muted">{t('noComments')}</p> : comments.map((comment) => (
                  <CommentThread key={comment.id} comment={comment} problemId={id} onReplyCreated={handleReplyCreated}/>
                ))}
              </div>
              {moreComments && <button type="button" disabled={commentLoading} onClick={loadMoreComments} className="mt-4 rounded-lg border border-white/15 px-4 py-2">{t(commentLoading ? 'loading' : 'loadMore')}</button>}
            </section>

            {problem.updates?.length > 0 && <section className="mt-8 border-t border-white/10 pt-6">
              <h2 className="text-xl font-bold mb-4">{t('updates')}</h2>
              <div className="space-y-3">{problem.updates.map((update) => <div key={update.id} className="site-comment border-l-4 border-violet-500 p-4"><p className="font-semibold">{translateStatus(update.status) || t('update')}</p><p className="mt-1 text-white/70">{translateSystemText(update.texto)}</p></div>)}</div>
            </section>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
