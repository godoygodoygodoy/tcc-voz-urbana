CREATE TABLE colecoes (
 id CHAR(36) NOT NULL, usuario_id CHAR(36) NOT NULL, nome VARCHAR(80) NOT NULL,
 privada BOOLEAN NOT NULL DEFAULT true, criada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(id), INDEX colecoes_usuario_id_criada_em_idx(usuario_id,criada_em),
 CONSTRAINT colecoes_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE itens_colecoes (
 id CHAR(36) NOT NULL, colecao_id CHAR(36) NOT NULL, salvo_id CHAR(36) NOT NULL,
 criada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(id),
 UNIQUE INDEX itens_colecoes_colecao_id_salvo_id_key(colecao_id,salvo_id), INDEX itens_colecoes_salvo_id_idx(salvo_id),
 CONSTRAINT itens_colecoes_colecao_id_fkey FOREIGN KEY(colecao_id) REFERENCES colecoes(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT itens_colecoes_salvo_id_fkey FOREIGN KEY(salvo_id) REFERENCES publicacoes_salvas(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
