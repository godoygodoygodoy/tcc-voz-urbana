-- Additive only: old stories retain their media and have no composition.
ALTER TABLE `stories`
 ADD COLUMN `composicao` JSON NULL,
 ADD COLUMN `original_url` VARCHAR(500) NULL,
 ADD COLUMN `chave_publicacao` VARCHAR(64) NULL,
 ADD COLUMN `hash_publicacao` CHAR(64) NULL;
CREATE UNIQUE INDEX `stories_usuario_id_chave_publicacao_key` ON `stories` (`usuario_id`,`chave_publicacao`);
CREATE TABLE `stories_respostas` (
 `id` CHAR(36) NOT NULL,
 `story_id` CHAR(36) NOT NULL,
 `usuario_id` CHAR(36) NOT NULL,
 `elemento_id` VARCHAR(64) NOT NULL,
 `valor` JSON NOT NULL,
 `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`),
 UNIQUE INDEX `stories_respostas_story_id_elemento_id_usuario_id_key` (`story_id`,`elemento_id`,`usuario_id`),
 INDEX `stories_respostas_usuario_id_idx` (`usuario_id`),
 CONSTRAINT `stories_respostas_story_id_fkey` FOREIGN KEY (`story_id`) REFERENCES `stories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `stories_respostas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
