# Perfil: diagnóstico de HTTP 404 e deploy

Investigação de 15/11/2026. Não foram aplicadas migrações, executados seeds, criados cadastros nem modificados dados de produção.

## Causa confirmada

O frontend publicado está configurado para `https://voz-urbana-api.onrender.com/api`. Seu manifesto registrava build em `2026-11-13T01:49:33.845Z`. Os caminhos locais não duplicam `/api`.

O usuário confirmou como ativo o deploy **93dc1f271f2d7ba080f1c3632063d189547361e4**. O log fornecido mostra que o build mais recente fez checkout de **508cf2f73edab6462ff3433010d20f62fce66de7**, branch **master**, gerou o Prisma Client e concluiu o build. O erro ocorre depois:

```text
Running 'npm run prisma:deploy && npm start'
No changes made. Use prisma:deploy -- --apply only after reviewing
the migration files and configuring backup verification.
Exited with status 1
```

`prisma:deploy` é uma ferramenta de manutenção com proteção explícita. Sem `--apply`, ela encerra com erro. Como os comandos estão ligados por `&&`, `npm start` nunca é executado. A versão nova não fica saudável e a antiga continua atendendo. **Build bem-sucedido não significa deploy ativo.**

A comparação direta com os arquivos do commit ativo confirma que ele não contém SSE em `notifications.js` nem conexões em comum, seguidores/seguindo e solicitações direcionais em `social.js`: ainda usa `/friendship`, `/friends` e `/friend-requests`. Também não registra os módulos atuais de participação e estatísticas.

Não é necessário recriar essas rotas: elas já estão implementadas e registradas na versão local atual.

## Auditoria das requisições

Base comum: `/api`. `:id` recebe o `id` retornado pelo perfil, não o username. Username é usado somente na rota explicitamente indicada. Métodos de mutação continuam autenticados. Na tabela, público significa autenticação opcional e verificação de privacidade no serviço.

| Método e caminho completo | Chamador frontend | Router e registro no servidor atual | Acesso / resposta |
| --- | --- | --- | --- |
| GET `/api/users/me` | App, ProfilePage → usersAPI | users.js, `/api/users` | Autenticado; conta atual |
| GET `/api/social/users/:id/profile` | UserProfilePage → socialAPI.profile | social.js/publicSocialRouter, `/api/social` | Público; perfil, contagens e `canViewPosts` |
| GET `/api/social/users/username/:username/profile` | UserProfilePage → profileByUsername | Mesmo router | Público; resolve username para id |
| GET `/api/social/users/:id/followers?page=` | UserProfilePage → followers | Mesmo router | Público; página `{data,total,page,limit}`, respeita privacidade |
| GET `/api/social/users/:id/following?page=` | UserProfilePage → following | Mesmo router | Público; página no mesmo formato |
| GET `/api/social/users/:id/common-connections` | UserProfilePage → commonConnections | social.js/router autenticado, `/api/social` | Autenticado; `{followers,following}` |
| GET mesma rota com `direction=followers\|following&page=` | Modal de conexões em comum | Mesmo router | Autenticado; página de uma direção |
| GET `/api/social/users/:id/relationship` | socialAPI.relationship | Mesmo router | Autenticado; following/followedBy/mutual/pending |
| POST / DELETE `/api/social/users/:id/follow` | Botões Seguir/Seguindo | Mesmo router | Autenticado; segue, solicita ou deixa de seguir |
| GET `/api/social/follow-requests/received` | ProfilePage → requests | Mesmo router | Autenticado; lista de solicitações recebidas |
| GET `/api/social/follow-requests/sent` | ProfilePage → sentRequests | Mesmo router | Autenticado; lista de solicitações enviadas |
| PATCH `/api/social/follow-requests/:id` | ProfilePage → respondFollowRequest | Mesmo router | Autenticado; accept/reject/cancel validado no backend |
| GET `/api/profile-features/:id/stats` | ProfileStats | profileFeatures.js, `/api/profile-features` | Público; números reais e watched privado |
| GET `/api/profile-features/me/presentation` | ProfilePresentation | Mesmo router | Autenticado; apresentação e capa mediada |
| PUT mesma rota | ProfilePresentation | Mesmo router | Autenticado; atualização com upload opcional |
| GET `/api/profile-features/:id/cover?access=` | Imagem de capa | Mesmo router | Ticket escopado e privacidade revalidada |
| GET `/api/participation/users/:id/achievements` | AchievementsPanel | participation.js, `/api/participation` | Público; `{data}`, sujeito à privacidade |
| GET `/api/notifications?paginated=true&page=1` | NotificationBell e FeedPage | notifications.js, `/api/notifications` | Autenticado; `{data,total,unread,page,limit}` |
| GET `/api/notifications/stream` | ActivityConnection, fetch com Bearer | Mesmo router, antes do fallback 404 | Autenticado; SSE `text/event-stream` |
| GET / PUT `/api/notifications/preferences` | NotificationPreferences | Mesmo router | Autenticado; `{preferences}` |
| PATCH `/api/notifications/:id/read` | NotificationBell / FeedPage | Mesmo router | Autenticado; leitura somente da própria conta |
| PATCH `/api/notifications/read-all` | Mesmo chamador | Mesmo router | Autenticado; contagem global atualizada |
| GET `/api/stories?owner=:id&page=` | StoriesRail | stories.js, `/api/stories` | Autenticado; audiência/expiração verificadas |
| GET `/api/collections` | Coleções próprias | collections.js, `/api/collections` | Autenticado |
| GET `/api/collections/public/:id` | Coleções de terceiros | Mesmo router | Público; respeita dono e publicação original |
| GET `/api/saved` e `/api/social/users/:id/likes` | Abas privadas do próprio perfil | saved.js e social.js | Autenticado; conteúdo próprio/visível |

Os arquivos de serviço frontend são `frontend/src/services/api.js` e, para o stream, `frontend/src/components/ActivityConnection.js`. Nenhum caminho dessa auditoria precisou ser renomeado ou duplicado.

## Verificações externas e origem de “Rota não encontrada”

Consultas externas sem sessão retornaram:

- `/health` e `/api/health`: **200**; CORS permite a origem publicada do site.
- `/api/profile-features/.../stats` e `/api/participation/users/.../achievements`: **404** com `{"error":"Rota não encontrada"}`. É o fallback da API antiga, não uma negação de privacidade.
- `/api/notifications/stream`, notificações, seguidores, solicitações e conexões: **401 sem token**. Isso, isoladamente, não comprova a existência dos handlers: o middleware autenticado do router antigo responde primeiro. O conteúdo do commit ativo e o 404 relatado na sessão do usuário confirmam a diferença de versão.

A mensagem literal vem do fallback final de `backend/src/server.js`, agora extraído para `middlewares/notFound.js`. O Axios localiza `response.data.error`; ações em `UserProfilePage`, `ProfilePage` e NotificationBell repassam o erro para o toast. As mensagens específicas das seções também são estados de falha de requisição. Não é um erro gerado pelo React Router.

Um 404 `profileNotFound` pode ser intencional para perfis inexistentes ou dados privados. Ele não é equivalente a uma rota ausente e continua preservado. Autenticação inválida continua 401 e listas privadas continuam 403 quando esse é o contrato existente.

## Banco: segundo impedimento confirmado

A leitura de `information_schema` e `_prisma_migrations` do banco configurado encontrou **12 migrações pendentes**, sem migrações fracassadas, e ausência de:

- `usuarios.perfil_privado`, `apresentacao`, `capa_url`;
- `problemas.bairro`, `fixada_em`, `etapa_codigo`;
- `publicacoes_salvas.acompanhando`, `comentarios.resposta_a_id`, `notificacoes.chave_evento`;
- snapshots de etapa em `atualizacoes_problemas`;
- tabelas de conquistas, preferências, coleções, stories, enquetes, etapas, confirmações e entrega de atualizações.

O comando foi somente de leitura. O banco configurado localmente deve ser comparado à `DATABASE_URL` do Render pelo responsável; credenciais não foram impressas nem comparadas por divulgação de seus valores. A configuração local de verificação de restauração de backup estava ausente.

Corrigir somente o Start Command ainda não deixa a versão nova pronta: o schema precisa ser revisado e atualizado pelo procedimento seguro. A migração de seguidores contém alterações de relacionamentos antigos, e o verificador conservador também sinaliza outros arquivos para revisão. Não substituir por `db push`, `migrate reset`, `--force` ou aplicação indiscriminada de SQL.

## Correções implementadas

- Health checks e log `server_listening` passam a informar `apiContract` e o SHA público `RENDER_GIT_COMMIT`, quando disponível. Não expõem segredos. A variável é fornecida pelo Render conforme sua [documentação oficial](https://render.com/docs/environment-variables).
- O manifesto do frontend inclui contrato, revisão e indicação de workspace com alterações não commitadas. Isso evita tratar um bundle local modificado como reprodução exata de um commit.
- Verificação de tabelas/colunas antes de iniciar o servidor e workers: se o banco estiver atrasado, o log apresenta `SCHEMA_NOT_READY` e os nomes ausentes, sem consultas de conteúdo pessoal. Não cria tabelas nem migra automaticamente.
- `npm run check:deployment`, em `backend/`, faz diagnóstico somente de leitura e retorna status de falha enquanto schema/histórico não estiverem prontos. `changesMade:false` é explícito.
- Fallback 404 mantém HTTP 404 e recebe `code:API_ROUTE_NOT_FOUND`. O frontend explica a incompatibilidade do deploy sem confundi-la com perfil privado ou transformá-la em sucesso. Logs não incluem query strings/tickets.
- Notificações, solicitações e estatísticas não exibem falsos estados vazios/zeros quando as requisições falham. Há recuperação/retry onde já existe o controle correspondente.
- SSE continua sendo SSE autenticado com fetch e Bearer; não foi introduzido WebSocket. Reconexão tem backoff limitado a 60 segundos, reiniciado ao conectar. Polling existente permanece disponível.
- O erro do comando de migração explica que ele não é Start Command. A necessidade de `--apply`, revisão e backup verificado foi mantida.

## Configuração que precisa ser corrigida no Render

O arquivo `render.yaml` já definia `startCommand: npm start`. O log prova que o valor usado no Dashboard diverge dele. No serviço informado pelo usuário:

```text
Root Directory: backend
Build Command: npm ci --include=dev && npm run prisma:generate
Start Command: npm start
Health Check Path: /health
Branch: master, confirmando o commit que se pretende publicar
```

Migrações são uma manutenção separada, após revisão, backup/restauração verificados e conferência da identidade do banco. O `safeMigrate` permanece bloqueado sem essas condições. Depois que o diagnóstico passar, publicar o backend correto e conferir o SHA/contrato no health check e nos logs; só então repetir as verificações autenticadas no site.

Não houve acesso autenticado ao Dashboard nesta sessão: o mecanismo de controle do navegador estava indisponível. Os logs de deploy analisados são os fornecidos pelo usuário, corroborados pela comparação Git e pelas respostas HTTP públicas. Nenhum deploy ou alteração de configuração do serviço foi realizado.

## Testes

Arquivos de implementação alterados: `backend/src/server.js`, `backend/src/config/release.js`, `backend/src/services/schemaCompatibility.js`, `backend/src/middlewares/notFound.js`, `backend/scripts/check-deployment.js`, `backend/scripts/safe-migrate.js`, `render.yaml`, `frontend/src/services/api.js`, `frontend/src/components/ActivityConnection.js`, `NotificationBell.js`, `ProfileStats.js`, `frontend/src/pages/ProfilePage.js`, `frontend/src/locales/interface.json` e `frontend/vite.config.mjs`. Os dois `package.json`, a fixture social e os testes de rotas/cliente/navegador também receberam comandos e regressões específicos. Não foram alteradas migrations nesta correção.

- 32 testes de API, autenticação, seguidores, privacidade, perfil, conquistas e notificações aprovados, incluindo quatro novos testes de correspondência dos caminhos/registro, SSE HTTP real e diagnóstico de schema.
- Três testes do cliente Axios aprovados, incluindo Bearer, URL local/produção e distinção entre 404 de rota e 404 de perfil.
- Navegador local: seis verificações de falha/recuperação, perfil próprio/terceiro e seguir; 19 de conexões/permissões/conversa; sete de notificações/SSE. Sem exceções JavaScript nos fluxos aprovados.
- Build de produção e auditoria de 1.038 chaves em três idiomas aprovados. Quatro testes de proteção de dados/migrações aprovados.

Fixtures são usadas exclusivamente nos testes isolados, nunca como conteúdo de preenchimento da aplicação. A validação autenticada da versão nova **em produção** depende do schema e do deploy corretos e ainda não pode ser afirmada.
