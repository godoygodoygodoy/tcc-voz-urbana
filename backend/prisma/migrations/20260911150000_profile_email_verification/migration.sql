ALTER TABLE `usuarios`
  ADD COLUMN `username` VARCHAR(30) NULL,
  ADD COLUMN `telefone` VARCHAR(30) NULL,
  ADD COLUMN `bio` TEXT NULL,
  ADD COLUMN `nivel` VARCHAR(20) NOT NULL DEFAULT 'USUARIO',
  ADD COLUMN `email_verificado` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `token_verificacao` VARCHAR(100) NULL,
  ADD COLUMN `token_verificacao_expira` DATETIME(3) NULL,
  ADD UNIQUE INDEX `usuarios_username_key` (`username`),
  ADD UNIQUE INDEX `usuarios_token_verificacao_key` (`token_verificacao`);