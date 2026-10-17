CREATE TABLE `amizades` (
  `id` CHAR(36) NOT NULL,
  `status` ENUM('PENDENTE', 'ACEITA', 'RECUSADA') NOT NULL DEFAULT 'PENDENTE',
  `solicitante_id` CHAR(36) NOT NULL,
  `destinatario_id` CHAR(36) NOT NULL,
  `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizada_em` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `amizades_solicitante_id_destinatario_id_key` (`solicitante_id`, `destinatario_id`),
  INDEX `amizades_destinatario_id_status_idx` (`destinatario_id`, `status`),
  CONSTRAINT `amizades_solicitante_id_fkey` FOREIGN KEY (`solicitante_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `amizades_destinatario_id_fkey` FOREIGN KEY (`destinatario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
