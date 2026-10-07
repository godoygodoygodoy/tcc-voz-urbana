ALTER TABLE `categorias`
  ADD COLUMN `icone` VARCHAR(10) NULL,
  ADD COLUMN `cor` VARCHAR(7) NULL;

INSERT INTO `categorias` (`id`, `nome`, `icone`, `cor`)
SELECT UUID(), 'Asfalto', '⚫', '#4B5563'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Asfalto');

INSERT INTO `categorias` (`id`, `nome`, `icone`, `cor`)
SELECT UUID(), 'Lixo', '🟢', '#166534'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Lixo');

INSERT INTO `categorias` (`id`, `nome`, `icone`, `cor`)
SELECT UUID(), 'Vegetação', '🌿', '#22C55E'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Vegetação');

INSERT INTO `categorias` (`id`, `nome`, `icone`, `cor`)
SELECT UUID(), 'Iluminação', '💡', '#FACC15'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Iluminação');

INSERT INTO `categorias` (`id`, `nome`, `icone`, `cor`)
SELECT UUID(), 'Sinalização', '🔵', '#2563EB'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Sinalização');

INSERT INTO `categorias` (`id`, `nome`, `icone`, `cor`)
SELECT UUID(), 'Saneamento', '🩵', '#06B6D4'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Saneamento');

INSERT INTO `categorias` (`id`, `nome`, `icone`, `cor`)
SELECT UUID(), 'Área com grande quantidade de furto', '🟣', '#7C3AED'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Área com grande quantidade de furto');

INSERT INTO `categorias` (`id`, `nome`, `icone`, `cor`)
SELECT UUID(), 'Acidentes de carros', '🔴', '#DC2626'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Acidentes de carros');

INSERT INTO `categorias` (`id`, `nome`, `icone`, `cor`)
SELECT UUID(), 'Outros', '⚪', '#6B7280'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Outros');

UPDATE `categorias` SET `icone` = '⚫', `cor` = '#4B5563' WHERE `nome` = 'Asfalto';
UPDATE `categorias` SET `icone` = '🟢', `cor` = '#166534' WHERE `nome` = 'Lixo';
UPDATE `categorias` SET `icone` = '🌿', `cor` = '#22C55E' WHERE `nome` = 'Vegetação';
UPDATE `categorias` SET `icone` = '💡', `cor` = '#FACC15' WHERE `nome` = 'Iluminação';
UPDATE `categorias` SET `icone` = '🔵', `cor` = '#2563EB' WHERE `nome` = 'Sinalização';
UPDATE `categorias` SET `icone` = '🩵', `cor` = '#06B6D4' WHERE `nome` = 'Saneamento';
UPDATE `categorias` SET `icone` = '🟣', `cor` = '#7C3AED' WHERE `nome` = 'Área com grande quantidade de furto';
UPDATE `categorias` SET `icone` = '🔴', `cor` = '#DC2626' WHERE `nome` = 'Acidentes de carros';
UPDATE `categorias` SET `icone` = '⚪', `cor` = '#6B7280' WHERE `nome` = 'Outros';
