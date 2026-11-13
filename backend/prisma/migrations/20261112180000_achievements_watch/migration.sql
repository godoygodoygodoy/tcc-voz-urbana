ALTER TABLE publicacoes_salvas ADD COLUMN acompanhando BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX salvos_usuario_acompanhando_idx ON publicacoes_salvas(usuario_id,acompanhando);
CREATE INDEX salvos_problema_acompanhando_idx ON publicacoes_salvas(problema_id,acompanhando);
CREATE TABLE conquistas_usuarios (
 id CHAR(36) NOT NULL,usuario_id CHAR(36) NOT NULL,codigo VARCHAR(40) NOT NULL,
 desbloqueada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),PRIMARY KEY(id),UNIQUE INDEX conquistas_usuarios_usuario_id_codigo_key(usuario_id,codigo),
 CONSTRAINT conquistas_usuarios_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
