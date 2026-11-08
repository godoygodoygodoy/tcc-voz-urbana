CREATE TABLE `publicacoes_salvas` (
  `id` CHAR(36) NOT NULL,
  `usuario_id` CHAR(36) NOT NULL,
  `problema_id` CHAR(36) NOT NULL,
  `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `publicacoes_salvas_usuario_id_problema_id_key` (`usuario_id`, `problema_id`),
  INDEX `publicacoes_salvas_usuario_id_criada_em_idx` (`usuario_id`, `criada_em`),
  CONSTRAINT `publicacoes_salvas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `publicacoes_salvas_problema_id_fkey` FOREIGN KEY (`problema_id`) REFERENCES `problemas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
