ALTER TABLE `problemas`
  ADD COLUMN `estado` VARCHAR(80) NULL,
  ADD COLUMN `cidade` VARCHAR(120) NULL;

CREATE INDEX `problemas_estado_cidade_idx` ON `problemas` (`estado`, `cidade`);
