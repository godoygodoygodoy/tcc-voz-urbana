-- Additive schema change: public is the default for every existing profile.
ALTER TABLE `usuarios` ADD COLUMN `perfil_privado` BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX `amizades_solicitante_id_status_idx` ON `amizades` (`solicitante_id`, `status`);
CREATE INDEX `mensagens_conversa_id_remetente_id_idx` ON `mensagens` (`conversa_id`, `remetente_id`);

-- Snapshot accepted legacy friendships before expanding them into two directions.
-- The original rows, IDs, pending requests, refusals, conversations and messages remain.
CREATE TEMPORARY TABLE `legacy_mutual_follows` AS
SELECT `solicitante_id`, `destinatario_id` FROM `amizades` WHERE `status` = 'ACEITA';

-- If an older import already contains the reverse edge, preserve that row and ID.
UPDATE `amizades` AS relation
INNER JOIN `legacy_mutual_follows` AS legacy
  ON relation.`solicitante_id` = legacy.`destinatario_id`
 AND relation.`destinatario_id` = legacy.`solicitante_id`
SET relation.`status` = 'ACEITA';

INSERT IGNORE INTO `amizades`
  (`id`, `status`, `solicitante_id`, `destinatario_id`, `criada_em`, `atualizada_em`)
SELECT UUID(), 'ACEITA', `destinatario_id`, `solicitante_id`, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `legacy_mutual_follows`;
DROP TEMPORARY TABLE `legacy_mutual_follows`;
-- All legacy profiles are public. Old pending requests become one-way follows,
-- after the legacy mutual friendships have been expanded above.
UPDATE `amizades` SET `status` = 'ACEITA' WHERE `status` = 'PENDENTE';
