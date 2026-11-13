CREATE TABLE `entregas_atualizacao` (
  `historico_id` CHAR(36) NOT NULL,
  `cursor_usuario_id` CHAR(36) NULL,
  `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`historico_id`),
  INDEX `entregas_atualizacao_data_idx` (`criada_em`, `historico_id`),
  CONSTRAINT `entregas_atualizacao_historico_fk` FOREIGN KEY (`historico_id`) REFERENCES `atualizacoes_problemas` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
