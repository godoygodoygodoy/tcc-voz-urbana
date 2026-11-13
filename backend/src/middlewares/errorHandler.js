export const errorHandler = (err, req, res, next) => {
  // Driver messages can contain SQL values and credentials. Log metadata only.
  console.error(JSON.stringify({ event: 'request_failed', time: new Date().toISOString(), method: req.method, route: req.route?.path || 'unmatched', code: err.code || err.name, databaseCode: err.cause?.originalCode, status: err.status || 500 }));

  if (res.headersSent) { res.destroy(); return; }
  if (err.code === 'MESSAGE_LIMIT_REACHED') return res.status(403).json({ error: 'chatLimitReached', code: err.code, messaging: err.messaging });

  if (['P2021', 'P2022'].includes(err.code)) return res.status(503).json({ error: 'featureUnavailable' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'Este registro já existe.' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' });
  if (['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(err.code)) return res.status(503).json({ error: 'Banco de dados temporariamente indisponível. Tente novamente.' });

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
    error: process.env.NODE_ENV === "production" && (!err.status || err.status >= 500)
      ? "Erro interno do servidor" : err.message || "Erro interno do servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
