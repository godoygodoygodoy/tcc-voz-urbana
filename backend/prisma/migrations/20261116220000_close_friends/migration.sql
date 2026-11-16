CREATE TABLE `amigos_proximos` (
 `dono_id` CHAR(36) NOT NULL, `convidado_id` CHAR(36) NOT NULL,
 PRIMARY KEY (`dono_id`,`convidado_id`), INDEX `amigos_proximos_convidado_id_idx` (`convidado_id`),
 CONSTRAINT `amigos_proximos_dono_id_fkey` FOREIGN KEY (`dono_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `amigos_proximos_convidado_id_fkey` FOREIGN KEY (`convidado_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
