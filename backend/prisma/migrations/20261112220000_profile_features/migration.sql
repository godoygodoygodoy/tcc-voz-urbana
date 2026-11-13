ALTER TABLE `usuarios` ADD COLUMN `apresentacao` VARCHAR(120) NULL, ADD COLUMN `capa_url` VARCHAR(500) NULL;
ALTER TABLE `problemas` ADD COLUMN `fixada_em` DATETIME(3) NULL;
CREATE INDEX `problemas_usuario_destaques_idx` ON `problemas` (`usuario_id`,`fixada_em`,`data_criacao`);
