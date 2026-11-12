# Conexões em comum no perfil

A seção usa as definições direcionais: seguidores em comum são pessoas com relações aceitas para visitante e perfil; seguindo em comum são os destinos aceitos dos dois. Solicitações pendentes ou recusadas não contam.

`GET /api/social/users/:id/common-connections` exige autenticação e retorna `followers` e `following`, cada um com `data`, `total`, `page` e `limit`. A prévia contém até quatro pessoas por grupo. Com `direction=followers|following&page=N`, retorna uma página de 30 pessoas para o modal de rede já existente. A interseção, contagem, ordenação e paginação ocorrem no Prisma/banco, sem baixar redes completas para calcular no navegador. Os índices direcionais existentes são reutilizados.

A visibilidade do perfil consultado é verificada no servidor antes da consulta. Perfis privados sem acesso aprovado não expõem listas ou contagens em comum. As pessoas retornadas também passam pelo predicado de visibilidade existente, incluindo administradores verificados pelo banco. Respostas são privadas e sem cache HTTP. A seção não aparece para visitantes anônimos ou no próprio perfil.

A prévia é buscada uma vez ao abrir o perfil e atualizada por alterações sociais locais/entre abas, retorno à aba e verificação periódica de 30 segundos. Requisições não se sobrepõem; a consulta é cancelada ao sair do perfil. Atualizações normais do perfil a cada cinco segundos não refazem a consulta de conexões. As listas completas reutilizam a paginação e a atualização do modal existente.

O botão Mensagem já utilizava a conversa canônica do sistema atual. Agora também bloqueia cliques repetidos enquanto abre e evita redirecionamento de uma resposta antiga após trocar de perfil. Continua disponível mesmo para perfis privados e sem acompanhamento mútuo; o backend mantém a cota individual de três mensagens ou a liberação por acompanhamento mútuo. Atingir a cota não impede a abertura nem oculta o histórico.

Não há tabelas, sistema de mensagens ou componentes de modal duplicados, nem migração adicional.

Verificações:

- `npm run test:profile-connections --prefix backend`: três testes com rotas reais e persistência isolada em memória, cobrindo direção, paginação, privacidade, solicitações pendentes, ausência de conversas duplicadas e preservação do histórico/cota.
- `npm run test:profile-connections:browser --prefix frontend`: preview na porta 4173, Chrome/Playwright; 19 verificações de interface e integração, incluindo celular, espanhol, mensagens bloqueadas e ilimitadas.
- Build de produção e auditoria de tradução aprovados; 761 chaves em português, inglês e espanhol. Testes adicionais de seguidores, chat e administração preservados.

Os testes não alteram o banco de produção. O teste de navegador usa as rotas reais conectadas a uma fixture em memória.
