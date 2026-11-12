-- Additive indexes for the recent feed and profile publication ordering.
CREATE INDEX problemas_data_idx ON problemas(data_criacao);
CREATE INDEX problemas_usuario_data_idx ON problemas(usuario_id, data_criacao);
