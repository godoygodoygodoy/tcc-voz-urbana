export const errorHandler = (err, req, res, next) => {
  console.error("Erro:", err);

  // Erros de validação Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: "Erro de validação",
      details: err.details.map((d) => d.message)
    });
  }

  // Erros de sequelize
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      error: "Erro de validação",
      details: err.errors.map((e) => e.message)
    });
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      error: "Campo duplicado",
      field: err.errors[0].path
    });
  }

  // Erro genérico
  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
