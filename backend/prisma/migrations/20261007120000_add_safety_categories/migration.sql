INSERT INTO `categorias` (`id`, `nome`)
SELECT UUID(), 'Lixo'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Lixo');

INSERT INTO `categorias` (`id`, `nome`)
SELECT UUID(), 'Vegetação'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Vegetação');

INSERT INTO `categorias` (`id`, `nome`)
SELECT UUID(), 'Furtos e roubos'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Furtos e roubos');

INSERT INTO `categorias` (`id`, `nome`)
SELECT UUID(), 'Acidentes de trânsito'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Acidentes de trânsito');

INSERT INTO `categorias` (`id`, `nome`)
SELECT UUID(), 'Outros'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Outros');
