CREATE TABLE `relacoes_seguranca` (
 `id` CHAR(36) NOT NULL, `origem_id` CHAR(36) NOT NULL, `destino_id` CHAR(36) NOT NULL,
 `tipo` VARCHAR(16) NOT NULL, `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`), UNIQUE INDEX `relacoes_seguranca_origem_id_destino_id_tipo_key` (`origem_id`,`destino_id`,`tipo`),
 INDEX `relacoes_seguranca_destino_id_tipo_origem_id_idx` (`destino_id`,`tipo`,`origem_id`),
 CONSTRAINT `relacoes_seguranca_origem_id_fkey` FOREIGN KEY (`origem_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `relacoes_seguranca_destino_id_fkey` FOREIGN KEY (`destino_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `ocultacoes_publicacoes` (
 `id` CHAR(36) NOT NULL, `usuario_id` CHAR(36) NOT NULL, `problema_id` CHAR(36) NOT NULL,
 `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
 UNIQUE INDEX `ocultacoes_publicacoes_usuario_id_problema_id_key` (`usuario_id`,`problema_id`), INDEX `ocultacoes_publicacoes_problema_id_idx` (`problema_id`),
 CONSTRAINT `ocultacoes_publicacoes_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `ocultacoes_publicacoes_problema_id_fkey` FOREIGN KEY (`problema_id`) REFERENCES `problemas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `preferencias_sociais` (
 `usuario_id` CHAR(36) NOT NULL, `mensagens` VARCHAR(16) NOT NULL DEFAULT 'TODOS', `mencoes` VARCHAR(16) NOT NULL DEFAULT 'TODOS', PRIMARY KEY (`usuario_id`),
 CONSTRAINT `preferencias_sociais_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `denuncias_sociais` (
 `id` CHAR(36) NOT NULL, `autor_id` CHAR(36) NOT NULL, `tipo_alvo` VARCHAR(16) NOT NULL, `alvo_id` CHAR(36) NOT NULL,
 `categoria` VARCHAR(24) NOT NULL, `motivo` VARCHAR(1000) NOT NULL, `estado` VARCHAR(16) NOT NULL DEFAULT 'ABERTA',
 `decisao` VARCHAR(1000) NULL, `moderador_id` CHAR(36) NULL, `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `atualizada_em` DATETIME(3) NOT NULL,
 PRIMARY KEY (`id`), UNIQUE INDEX `denuncias_sociais_autor_id_tipo_alvo_alvo_id_categoria_key` (`autor_id`,`tipo_alvo`,`alvo_id`,`categoria`),
 INDEX `denuncias_sociais_estado_criada_em_id_idx` (`estado`,`criada_em`,`id`), INDEX `denuncias_sociais_moderador_id_idx` (`moderador_id`),
 CONSTRAINT `denuncias_sociais_autor_id_fkey` FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `denuncias_sociais_moderador_id_fkey` FOREIGN KEY (`moderador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
