ALTER TABLE notificacoes ADD COLUMN chave_evento VARCHAR(191) NULL;
CREATE UNIQUE INDEX notificacoes_chave_evento_key ON notificacoes(chave_evento);
CREATE TABLE preferencias_notificacoes (
 id CHAR(36) NOT NULL,usuario_id CHAR(36) NOT NULL,tipo VARCHAR(50) NOT NULL,ativa BOOLEAN NOT NULL DEFAULT true,
 PRIMARY KEY(id),UNIQUE INDEX preferencias_notificacoes_usuario_id_tipo_key(usuario_id,tipo),
 CONSTRAINT preferencias_notificacoes_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE stories_visualizacoes ADD COLUMN reacao VARCHAR(10) NULL;
