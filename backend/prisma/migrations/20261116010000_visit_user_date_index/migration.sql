-- Add the composite index declared in Prisma; retain the existing FK index.
CREATE INDEX `visitas_usuario_data_idx` ON `visitas` (`usuario_id`, `criada_em`);
