CREATE TABLE `visitas` (
    `id` CHAR(36) NOT NULL,
    `visitante_id` VARCHAR(128) NOT NULL,
    `caminho` VARCHAR(255) NOT NULL,
    `usuario_id` CHAR(36) NULL,
    `criada_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `visitas_criada_em_idx`(`criada_em`),
    INDEX `visitas_visitante_id_criada_em_idx`(`visitante_id`, `criada_em`),
    INDEX `visitas_caminho_criada_em_idx`(`caminho`, `criada_em`),
    INDEX `visitas_usuario_id_criada_em_idx`(`usuario_id`),
    CONSTRAINT `visitas_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
