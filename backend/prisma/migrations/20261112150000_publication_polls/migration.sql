CREATE TABLE enquetes (
 id CHAR(36) NOT NULL,problema_id CHAR(36) NOT NULL,pergunta VARCHAR(200) NOT NULL,encerra_em DATETIME(3) NULL,
 criada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),PRIMARY KEY(id),UNIQUE INDEX enquetes_problema_id_key(problema_id),
 CONSTRAINT enquetes_problema_id_fkey FOREIGN KEY(problema_id) REFERENCES problemas(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE enquetes_opcoes (
 id CHAR(36) NOT NULL,enquete_id CHAR(36) NOT NULL,texto VARCHAR(100) NOT NULL,ordem INTEGER NOT NULL,PRIMARY KEY(id),
 UNIQUE INDEX enquetes_opcoes_enquete_id_id_key(enquete_id,id),UNIQUE INDEX enquetes_opcoes_enquete_id_ordem_key(enquete_id,ordem),
 CONSTRAINT enquetes_opcoes_enquete_id_fkey FOREIGN KEY(enquete_id) REFERENCES enquetes(id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE enquetes_votos (
 id CHAR(36) NOT NULL,usuario_id CHAR(36) NOT NULL,enquete_id CHAR(36) NOT NULL,opcao_id CHAR(36) NOT NULL,
 criada_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),PRIMARY KEY(id),UNIQUE INDEX enquetes_votos_usuario_id_enquete_id_key(usuario_id,enquete_id),
 INDEX enquetes_votos_enquete_id_opcao_id_idx(enquete_id,opcao_id),
 CONSTRAINT enquetes_votos_usuario_id_fkey FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT enquetes_votos_enquete_id_fkey FOREIGN KEY(enquete_id) REFERENCES enquetes(id) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT enquetes_votos_enquete_id_opcao_id_fkey FOREIGN KEY(enquete_id,opcao_id) REFERENCES enquetes_opcoes(enquete_id,id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
