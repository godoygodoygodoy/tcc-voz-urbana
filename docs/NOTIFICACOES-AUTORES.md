# Autoria real das notificações

Implementação e validação em 15/11/2026, horário de Brasília.

## Origem e solução

`notificacoes.usuario_id` identifica o destinatário. Não havia relacionamento com o autor; as frases eram genéricas e a deduplicação agrupava pessoas diferentes pelo destinatário/tipo/link.

A migração `20261116020000_notification_actor` acrescenta `autor_id` opcional, índice e FK para `usuarios`, com `ON DELETE SET NULL`. A FK do destinatário permanece intacta. Os dados atuais de nome, username e avatar são consultados em lotes ao listar notificações; não são copiados como identidade em texto. O autor é definido pelo usuário autenticado no servidor, nunca pelo payload do cliente.

Produtores revisados: seguir, solicitar, aceitar solicitação, apoio/interação com publicação, comentário, resposta, menção em comentário, reação a story, mensagem, status administrativo e entrega de atualização de problema acompanhado. Confirmações comunitárias agora notificam o proprietário, na mesma transação, com preferência própria, deduplicação e sem notificação para si próprio. Conquistas continuam sendo eventos do sistema, sem autor humano inventado. Não foi acrescentado um sistema novo de menções em publicações: a origem de menções já existente é o comentário.

A deduplicação de eventos ativos inclui o autor. As chaves permanentes existentes mantêm sua identidade para não duplicar entregas após reinício/retry. Preferências, SSE, paginação, filtros e marcação de leitura foram preservados.

## Privacidade, histórico e apresentação

- A API devolve somente id, nome, username e avatar do autor autorizado, sem e-mail, telefone, identificadores internos de autoria ou dados privados do perfil.
- A identidade básica de quem envia um acompanhamento/solicitação continua visível ao destinatário, como já ocorre nas listas de solicitações e no perfil público básico. Isso não dá acesso às publicações privadas. Nos outros eventos, a identidade respeita a visibilidade atual do perfil; uma solicitação visível não libera a identidade em outros tipos de evento.
- Autor restrito: identidade e link de perfil ausentes. Autor excluído: FK fica nula e a notificação permanece; interface mostra estado indisponível e fallback padrão. O link histórico de acompanhamento para perfil indisponível também é suprimido.
- O backfill recupera somente eventos sociais conhecidos cujo link corresponde exatamente a `/profile/<id de usuário existente>`. Não deduz autor a partir de nomes, proprietário da publicação, conversa ou story. Histórico sem referência inequívoca é preservado sem atribuição inventada.
- Central e sino reutilizam `NotificationItem`, `Avatar`, links de perfil, cores, bordas e estilos existentes. Nome e avatar levam ao autor; botão da ação leva ao conteúdo e mantém a leitura. Mostram username, descrição traduzida e tempo decorrido. Datas usam Intl nativo, evitando levar a biblioteca de datas para o carregamento global.
- Catálogos atualizados em português, inglês e espanhol; nomes e conteúdo de usuários não são traduzidos.

## Validação

- Testes de API/serviço verificam identidade autenticada, tentativas de forjar autor, nomes/avatar atualizados, privacidade por evento, acompanhamento privado, exclusão simulada, deduplicação por pessoa, preferências e todos os produtores listados.
- `test:expansion`, `test:profile-routes`, `test:followers`: passaram com persistência isolada em memória.
- Navegador: `test:notification-actors:browser` (13 verificações) e `test:activity:browser` (8 verificações), sem erros JavaScript. Avatar, fallback, autor clicável na central e no sino, ações, SSE, filtros/leitura e larguras 320/390/768/1440 px verificados.
- Build, `prisma validate`, geração do Prisma 7.10.0, auditoria i18n (1057 chaves em três idiomas) e testes do motor de tradução passaram.
- Migração ensaiada com `prisma migrate deploy` em uma restauração local isolada do banco real, acessível somente por loopback. Backup integral novo fora do checkout, SHA-256 e contagens de linhas verificados por restauração em schema vazio.
- Ensaio: **6 notificações preservadas**, todos os valores anteriores intactos, **4 autores históricos recuperados** por referência inequívoca e FK com exclusão SET NULL confirmada. Nenhum registro fictício foi inserido em produção.

Backup privado de ensaio: `C:\Users\Usuario\Documents\VozUrbanaBackups\voz-urbana-2026-11-16T01-51-11-681Z.sql` (nome em UTC; 15/11 às 22:51 em Brasília). O manifesto de revisão/checksum e o resultado do ensaio ficaram na pasta privada de validação, fora do Git. O script operacional temporário foi removido do checkout.

## Situação da produção

**Atualização após autorização explícita do usuário:** a migração `20261116020000_notification_actor` foi aplicada em produção com sucesso por `prisma migrate deploy`, após novo backup integral e restauração verificada. Backup: `C:\Users\Usuario\Documents\VozUrbanaBackups\voz-urbana-2026-11-16T02-53-18-290Z.sql` (UTC; 15/11 às 23:53 em Brasília). As seis notificações originais foram preservadas com todos os valores anteriores intactos; quatro autores históricos foram identificados, zero referências órfãs e FK SET NULL confirmada. O bloqueio relatado abaixo é histórico e foi resolvido pela autorização. Nenhum deploy foi executado.

Antes dessa autorização, a revisão automática de aprovação havia rejeitado a execução produtiva por exigir consentimento explícito para a nova escrita. A primeira execução foi restrita a backup de leitura e migração/restauração em schemas locais isolados.

O código depende da coluna `notificacoes.autor_id`, agora criada. O bloqueio SCHEMA_NOT_READY permanece ativo para futuras incompatibilidades.

O fluxo protegido foi concluído sem reset ou db push. Resta publicar backend/frontend. A publicação e os logs privados do Render não foram acessados nesta implementação.

## Arquivos

Banco: `backend/prisma/schema.prisma` e migração de autoria. Backend: serviço/rotas de notificações, produtores sociais, comentários, votos, stories, mensagens, status, acompanhamento e confirmações, helper de notificações e testes. Frontend: componente compartilhado `NotificationItem`, `NotificationBell`, renderização da central em `FeedPage`, CSS, catálogo de idiomas, testes de navegador e comando no package.json.
