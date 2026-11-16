CREATE TABLE `notas` (
 `id` CHAR(36) NOT NULL, `usuario_id` CHAR(36) NOT NULL, `texto` VARCHAR(140) NOT NULL, `audiencia` VARCHAR(20) NOT NULL DEFAULT 'SEGUIDORES',
 `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `expira_em` DATETIME(3) NOT NULL, `excluido_em` DATETIME(3) NULL,
 PRIMARY KEY (`id`), INDEX `notas_usuario_id_expira_em_idx` (`usuario_id`,`expira_em`), INDEX `notas_expira_em_criada_em_idx` (`expira_em`,`criada_em`),
 CONSTRAINT `notas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `reposts` (
 `id` CHAR(36) NOT NULL, `usuario_id` CHAR(36) NOT NULL, `original_id` CHAR(36) NOT NULL, `problema_id` CHAR(36) NULL, `comentario` VARCHAR(500) NOT NULL DEFAULT '',
 `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`), UNIQUE INDEX `reposts_usuario_id_original_id_key` (`usuario_id`,`original_id`),
 INDEX `reposts_problema_id_idx` (`problema_id`), INDEX `reposts_criada_em_id_idx` (`criada_em`,`id`),
 CONSTRAINT `reposts_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `reposts_problema_id_fkey` FOREIGN KEY (`problema_id`) REFERENCES `problemas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
