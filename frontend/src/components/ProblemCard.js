import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiThumbsUp, FiImage, FiCalendar } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProblemCard = ({ problem }) => {
  const navigate = useNavigate();

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
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
      onClick={() => navigate(`/problem/${problem.id}`)}
    >
      {problem.images?.length > 0 && (
        <div className="h-40 bg-gray-200 overflow-hidden">
          <img
            src={problem.images[0].url}
            alt={problem.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div
            className="px-3 py-1 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: problem.category?.color }}
          >
            {problem.category?.name}
          </div>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(problem.status)}`}>
            {problem.status}
          </span>
        </div>

        <h3 className="font-bold text-lg mb-2 line-clamp-2">{problem.title}</h3>
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">{problem.description}</p>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <FiMapPin size={16} />
            <span>{problem.address || 'Local não especificado'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <FiThumbsUp /> {problem.votes}
            </div>
            {problem.images?.length > 0 && (
              <div className="flex items-center gap-1">
                <FiImage /> {problem.images.length}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(problem.createdAt), { locale: ptBR, addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProblemCard;
