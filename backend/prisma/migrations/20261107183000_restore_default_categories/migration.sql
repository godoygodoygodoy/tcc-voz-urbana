INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Asfalto', 'Problemas em ruas, vias e pavimentação.', '⚫', '#4B5563'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Asfalto');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Lixo', 'Acúmulo, descarte irregular e coleta de lixo.', '🟢', '#166534'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Lixo');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Vegetação', 'Problemas relacionados a árvores, mato e áreas verdes.', '🌿', '#22C55E'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Vegetação');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Iluminação', 'Falhas ou ausência de iluminação pública.', '💡', '#FACC15'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Iluminação');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Sinalização', 'Problemas em placas, semáforos e sinalização viária.', '🔵', '#2563EB'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Sinalização');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Saneamento', 'Problemas de água, esgoto e drenagem urbana.', '🩵', '#06B6D4'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Saneamento');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Área com grande quantidade de furto', 'Locais com recorrência de furtos ou roubos.', '🟣', '#7C3AED'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Área com grande quantidade de furto');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Acidentes de carros', 'Locais ou situações com acidentes de trânsito.', '🔴', '#DC2626'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Acidentes de carros');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Outros', 'Problemas que não se enquadram nas demais categorias.', '⚪', '#6B7280'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Outros');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Limpeza', 'Problemas de limpeza e conservação urbana.', '🧹', '#15803D'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Limpeza');

INSERT INTO `categorias` (`id`, `nome`, `descricao`, `icone`, `cor`)
SELECT UUID(), 'Acessibilidade', 'Barreiras e problemas de acessibilidade urbana.', '♿', '#0EA5E9'
WHERE NOT EXISTS (SELECT 1 FROM `categorias` WHERE `nome` = 'Acessibilidade');
