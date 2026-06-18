const errorHandler = (err, req, res, next) => {
  console.error('Erro:', err);

  // Erros de validação Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Erro de validação',
      details: err.details.map(d => d.message)
    });
  }

  // Erros do Prisma
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'Erro de validação',
      details: [err.message]
    });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Campo duplicado',
      field: Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro não encontrado'
    });
  }

  // Erro genérico
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler
};
