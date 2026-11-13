CREATE TABLE `etapas_problemas` (
 `codigo` VARCHAR(40) NOT NULL, `nome` VARCHAR(80) NULL,
 `status_base` ENUM('ABERTO','EM_ANDAMENTO','RESOLVIDO','REJEITADO') NOT NULL,
 `cor` VARCHAR(7) NOT NULL DEFAULT '#7C3AED', `ativa` BOOLEAN NOT NULL DEFAULT true,
 PRIMARY KEY (`codigo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `problemas` ADD COLUMN `etapa_codigo` VARCHAR(40) NULL;
CREATE INDEX `problemas_etapa_codigo_idx` ON `problemas` (`etapa_codigo`);
ALTER TABLE `problemas` ADD CONSTRAINT `problemas_etapa_fk` FOREIGN KEY (`etapa_codigo`) REFERENCES `etapas_problemas` (`codigo`) ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE `atualizacoes_problemas` ADD COLUMN `etapa_codigo` VARCHAR(40) NULL, ADD COLUMN `etapa_nome` VARCHAR(80) NULL, ADD COLUMN `status_anterior` ENUM('ABERTO','EM_ANDAMENTO','RESOLVIDO','REJEITADO') NULL;
CREATE TABLE `confirmacoes_problemas` (
 `id` CHAR(36) NOT NULL, `usuario_id` CHAR(36) NOT NULL, `problema_id` CHAR(36) NOT NULL,
 `escolha` VARCHAR(30) NOT NULL, `registrada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`), UNIQUE INDEX `confirmacoes_usuario_problema_key` (`usuario_id`,`problema_id`),
 INDEX `confirmacoes_problema_escolha_data_idx` (`problema_id`,`escolha`,`registrada_em`),
 CONSTRAINT `confirmacoes_usuario_fk` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
 CONSTRAINT `confirmacoes_problema_fk` FOREIGN KEY (`problema_id`) REFERENCES `problemas` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
