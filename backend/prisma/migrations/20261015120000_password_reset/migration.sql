ALTER TABLE `usuarios`
  ADD COLUMN `senha_reset_token_hash` CHAR(64) NULL,
  ADD COLUMN `senha_reset_expira` DATETIME(3) NULL,
  ADD UNIQUE INDEX `usuarios_senha_reset_token_hash_key` (`senha_reset_token_hash`);
