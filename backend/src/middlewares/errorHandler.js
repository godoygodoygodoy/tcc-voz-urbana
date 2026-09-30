export const errorHandler = (err, req, res, next) => {
  console.error("Erro:", err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "A imagem excede o limite de 5 MB." });
  }
  if (err.name === "MulterError" || err.status === 400) {
    return res.status(err.status || 400).json({ error: err.message || "Não foi possível processar o arquivo enviado." });
  }

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
