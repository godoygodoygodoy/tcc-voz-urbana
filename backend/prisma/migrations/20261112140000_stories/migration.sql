CREATE TABLE stories (
 id CHAR(36) NOT NULL,usuario_id CHAR(36) NOT NULL,url VARCHAR(500) NOT NULL,poster_url VARCHAR(500) NULL,
 mime VARCHAR(50) NOT NULL,audiencia VARCHAR(20) NOT NULL DEFAULT 'SEGUIDORES',
 criada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),expira_em DATETIME(3) NOT NULL,excluido_em DATETIME(3) NULL,
 PRIMARY KEY(id),INDEX stories_expira_em_excluido_em_idx(expira_em,excluido_em),INDEX stories_usuario_id_criada_em_idx(usuario_id,criada_em),
 CONSTRAINT stories_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE stories_visualizacoes (
 id CHAR(36) NOT NULL,story_id CHAR(36) NOT NULL,usuario_id CHAR(36) NOT NULL,criada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(id),UNIQUE INDEX stories_visualizacoes_story_id_usuario_id_key(story_id,usuario_id),INDEX stories_visualizacoes_usuario_id_idx(usuario_id),
 CONSTRAINT stories_visualizacoes_story_id_fkey FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT stories_visualizacoes_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
