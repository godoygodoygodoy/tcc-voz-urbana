ALTER TABLE `problemas` ADD COLUMN `bairro` VARCHAR(120) NULL;
CREATE INDEX `problemas_regiao_data_idx` ON `problemas` (`estado`, `cidade`, `bairro`, `data_criacao`);
