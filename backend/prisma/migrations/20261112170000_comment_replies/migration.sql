ALTER TABLE comentarios ADD COLUMN resposta_a_id CHAR(36) NULL;
CREATE INDEX comentarios_problema_resposta_data_idx ON comentarios(problema_id,resposta_a_id,data_criacao);
CREATE INDEX comentarios_resposta_data_idx ON comentarios(resposta_a_id,data_criacao);
ALTER TABLE comentarios ADD CONSTRAINT comentarios_resposta_a_id_fkey FOREIGN KEY(resposta_a_id) REFERENCES comentarios(id) ON DELETE SET NULL ON UPDATE RESTRICT;
