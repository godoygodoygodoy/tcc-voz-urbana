-- Relax the two legacy participant columns only to represent genuine groups.
-- Existing direct conversation pairs, IDs and histories remain untouched.
ALTER TABLE `conversas`
 MODIFY COLUMN `usuario_a_id` CHAR(36) NULL,
 MODIFY COLUMN `usuario_b_id` CHAR(36) NULL,
 ADD COLUMN `tipo` VARCHAR(16) NOT NULL DEFAULT 'DIRETA',
 ADD COLUMN `nome` VARCHAR(100) NULL,
 ADD COLUMN `descricao` VARCHAR(1000) NULL,
 ADD COLUMN `criador_id` CHAR(36) NULL;
CREATE INDEX `conversas_criador_id_idx` ON `conversas` (`criador_id`);
CREATE INDEX `conversas_tipo_atualizada_em_id_idx` ON `conversas` (`tipo`,`atualizada_em`,`id`);
ALTER TABLE `conversas` ADD CONSTRAINT `conversas_criador_id_fkey` FOREIGN KEY (`criador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `mensagens` ADD COLUMN `resposta_id` CHAR(36) NULL;
CREATE INDEX `mensagens_resposta_id_idx` ON `mensagens` (`resposta_id`);
ALTER TABLE `mensagens` ADD CONSTRAINT `mensagens_resposta_id_fkey` FOREIGN KEY (`resposta_id`) REFERENCES `mensagens` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE `participantes_conversas` (
 `conversa_id` CHAR(36) NOT NULL, `usuario_id` CHAR(36) NOT NULL, `papel` VARCHAR(16) NOT NULL DEFAULT 'MEMBRO', `estado` VARCHAR(16) NOT NULL DEFAULT 'ATIVO', `lida_ate` DATETIME(3) NULL,
 PRIMARY KEY (`conversa_id`,`usuario_id`), INDEX `participantes_conversas_usuario_id_estado_idx` (`usuario_id`,`estado`),
 CONSTRAINT `participantes_conversas_conversa_id_fkey` FOREIGN KEY (`conversa_id`) REFERENCES `conversas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `participantes_conversas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `reacoes_mensagens` (
 `mensagem_id` CHAR(36) NOT NULL, `usuario_id` CHAR(36) NOT NULL, `emoji` VARCHAR(16) NOT NULL,
 PRIMARY KEY (`mensagem_id`,`usuario_id`), INDEX `reacoes_mensagens_usuario_id_idx` (`usuario_id`),
 CONSTRAINT `reacoes_mensagens_mensagem_id_fkey` FOREIGN KEY (`mensagem_id`) REFERENCES `mensagens` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `reacoes_mensagens_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
