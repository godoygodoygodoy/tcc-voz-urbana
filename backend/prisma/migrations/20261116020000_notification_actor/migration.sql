-- Optional actor preserves every existing notification. Account deletion removes
-- the relationship, never the recipient's notification history.
ALTER TABLE `notificacoes` ADD COLUMN `autor_id` CHAR(36) NULL;
CREATE INDEX `notificacoes_autor_idx` ON `notificacoes` (`autor_id`);
ALTER TABLE `notificacoes` ADD CONSTRAINT `notificacoes_autor_fk`
  FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Only these social events point directly at their actor's profile. A post,
-- story, conversation or free-text name never proves who performed the action.
UPDATE `notificacoes` AS notification
INNER JOIN `usuarios` AS actor ON notification.`link` = CONCAT('/profile/', actor.`id`)
SET notification.`autor_id` = actor.`id`
WHERE notification.`autor_id` IS NULL AND notification.`tipo` IN
  ('NOVO_SEGUIDOR','SEGUIR_SOLICITACAO','SEGUIR_ACEITA','AMIZADE_SOLICITACAO','AMIZADE_ACEITA');
