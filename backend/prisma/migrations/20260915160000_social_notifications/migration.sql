ALTER TABLE `imagens`
  ADD COLUMN `tipo` ENUM('ANTES', 'DEPOIS') NOT NULL DEFAULT 'ANTES';

CREATE TABLE `comentarios` (
  `id` CHAR(36) NOT NULL,
  `texto` TEXT NOT NULL,
  `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `usuario_id` CHAR(36) NOT NULL,
  `problema_id` CHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `comentarios_problema_data_idx` (`problema_id`, `data_criacao`),
  CONSTRAINT `comentarios_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `comentarios_problema_fk` FOREIGN KEY (`problema_id`) REFERENCES `problemas`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notificacoes` (
  `id` CHAR(36) NOT NULL,
  `tipo` VARCHAR(50) NOT NULL,
  `titulo` VARCHAR(150) NOT NULL,
  `mensagem` VARCHAR(500) NOT NULL,
  `lida` BOOLEAN NOT NULL DEFAULT FALSE,
  `link` VARCHAR(300) NULL,
  `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `usuario_id` CHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `notificacoes_usuario_lida_data_idx` (`usuario_id`, `lida`, `data_criacao`),
  CONSTRAINT `notificacoes_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `atualizacoes_problemas` (
  `id` CHAR(36) NOT NULL,
  `texto` TEXT NOT NULL,
  `status` ENUM('ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO') NULL,
  `data_criacao` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `usuario_id` CHAR(36) NOT NULL,
  `problema_id` CHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `atualizacoes_problemas_data_idx` (`problema_id`, `data_criacao`),
  CONSTRAINT `atualizacoes_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `atualizacoes_problema_fk` FOREIGN KEY (`problema_id`) REFERENCES `problemas`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
