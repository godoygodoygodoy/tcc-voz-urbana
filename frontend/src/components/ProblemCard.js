import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiThumbsUp, FiImage, FiCalendar } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { getPurpleTone, getStatusTone } from '../utils/theme';

const ProblemCard = ({ problem }) => {
  const navigate = useNavigate();

  const categoryColor = getPurpleTone(problem.category?.name || problem.category?.id || problem.id);

  return (
    <motion.article
      role="button"
      tabIndex={0}
      aria-label={`Abrir problema ${problem.title}`}
      className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#05060a] shadow-[0_18px_50px_rgba(0,0,0,0.32)] outline-none"
      style={{ transformStyle: 'preserve-3d' }}
      onClick={() => navigate(`/problem/${problem.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/problem/${problem.id}`);
        }
      }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      whileHover={{ y: -8, rotateX: 3, rotateY: -3, scale: 1.01 }}
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_40%)]" />

      {problem.images?.length > 0 && (
        <div className="relative h-44 overflow-hidden">
          <img
            src={problem.images[0].url}
            alt={problem.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        </div>
      )}

      <div className="relative p-5 text-white">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className="inline-flex max-w-[70%] items-center rounded-full px-3 py-1 text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: categoryColor }}
          >
            {problem.category?.name || 'Sem categoria'}
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getStatusTone(problem.status)}`}>
            {problem.status}
          </span>
        </div>

        <h3 className="mb-2 text-lg font-black leading-snug text-white line-clamp-2">{problem.title}</h3>
        <p className="mb-4 text-sm leading-6 text-white/70 line-clamp-2">{problem.description}</p>

        <div className="mb-4 flex items-start gap-2 text-sm text-white/55">
          <FiMapPin size={16} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{problem.address || 'Local não especificado'}</span>
        </div>

        <div className="flex items-center justify-between border-t border-white/8 pt-4">
          <div className="flex items-center gap-4 text-sm text-white/80">
            <div className="flex items-center gap-1 font-semibold">
              <FiThumbsUp /> {problem.votes || 0}
            </div>
            {problem.images?.length > 0 && (
              <div className="flex items-center gap-1 font-semibold">
                <FiImage /> {problem.images.length}
              </div>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-white/45">
            <FiCalendar />
            {formatDistanceToNow(new Date(problem.createdAt), { locale: ptBR, addSuffix: true })}
          </span>
        </div>
      </div>
    </motion.article>
  );
};

export default ProblemCard;
