CREATE TABLE `conversas` (
  `id` CHAR(36) NOT NULL,
  `usuario_a_id` CHAR(36) NOT NULL,
  `usuario_b_id` CHAR(36) NOT NULL,
  `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizada_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `conversas_usuario_a_id_usuario_b_id_key` (`usuario_a_id`, `usuario_b_id`),
  INDEX `conversas_usuario_a_id_atualizada_em_idx` (`usuario_a_id`, `atualizada_em`),
  INDEX `conversas_usuario_b_id_atualizada_em_idx` (`usuario_b_id`, `atualizada_em`),
  CONSTRAINT `conversas_usuario_a_id_fkey` FOREIGN KEY (`usuario_a_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `conversas_usuario_b_id_fkey` FOREIGN KEY (`usuario_b_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `mensagens` (
  `id` CHAR(36) NOT NULL,
  `texto` TEXT NOT NULL,
  `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `conversa_id` CHAR(36) NOT NULL,
  `remetente_id` CHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `mensagens_conversa_id_criada_em_idx` (`conversa_id`, `criada_em`),
  INDEX `mensagens_remetente_id_criada_em_idx` (`remetente_id`, `criada_em`),
  CONSTRAINT `mensagens_conversa_id_fkey` FOREIGN KEY (`conversa_id`) REFERENCES `conversas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `mensagens_remetente_id_fkey` FOREIGN KEY (`remetente_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
