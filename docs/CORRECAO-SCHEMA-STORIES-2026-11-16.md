# Correção de SCHEMA_NOT_READY — Stories — 16/11/2026

## Diagnóstico confirmado

A etapa anterior do editor de Stories acrescentou `composicao`, `original_url`, `chave_publicacao`, `hash_publicacao` e o modelo `StoryResposta`. A migration `20261116170000_story_composition` foi incluída no commit `d2e607e` (16/11/2026 às 16:49:44, America/Sao_Paulo), mas ainda não havia sido aplicada em produção, conforme a entrega anterior.

Auditoria direta no mesmo banco de produção já confirmado pelo usuário:

- 33 migrations aplicadas; somente `20261116170000_story_composition` pendente; nenhuma migration falha/incompleta registrada.
- Ausência exatamente das quatro colunas e de `stories_respostas`.
- Colunas de identificação das tabelas relacionadas: `CHAR(36)`, `utf8mb4_unicode_ci`, compatíveis com as FKs novas.
- A comparação Prisma do banco real contra `schema.prisma` mostrou somente as estruturas dessa migration; nenhum outro desvio.
- `prisma generate` apenas gera o cliente. Não cria essas estruturas no banco.
- `render.yaml` já recomendava `npm run start:production`, mas `npm start` ainda iniciava diretamente `src/server.js`. O comando informado no log do serviço contornava a etapa de migrations. Alterar o YAML não demonstra que a configuração de um serviço existente no painel foi atualizada.

A proteção `SCHEMA_NOT_READY` estava correta e foi mantida integralmente.

## Migration e riscos

**Nenhuma migration nova foi criada:** foi revisada e aplicada a existente `20261116170000_story_composition`.

- Quatro colunas opcionais em `stories`; registros antigos permanecem válidos com `NULL`.
- Índice único `stories(usuario_id, chave_publicacao)`, permitindo chaves nulas nos registros antigos.
- `stories_respostas`: PK `id`, resposta JSON, data com milissegundos, unicidade por `(story_id, elemento_id, usuario_id)` e índice de usuário.
- FKs `story_id → stories.id` e `usuario_id → usuarios.id`, ambas `ON DELETE CASCADE ON UPDATE CASCADE`, conforme Prisma.
- Nenhum DROP, reset, db push, preenchimento fictício ou conversão geral de collation.

Riscos apresentados antes da execução: lock breve no ALTER TABLE e DDL potencialmente parcial se a conexão falhar, pois DDL MySQL não possui rollback transacional geral. Não houve falha durante a aplicação. As novas cascatas afetam somente respostas associadas a uma futura exclusão de usuário/Story; nenhum registro existente foi excluído por essa migration.

## Backup, ensaio e aplicação

Backups privados fora do checkout, em `C:\Users\Usuario\Documents\VozUrbanaBackups`:

- Ensaio: `voz-urbana-2026-11-16T20-00-57-785Z.sql`.
- Imediatamente antes da aplicação: `voz-urbana-2026-11-16T20-03-05-670Z.sql`.

Ambos foram restaurados numa instância MySQL 9.2 exclusiva em loopback. A verificação incluiu checksum, inventário de tabelas/objetos e contagens de registros. Nenhum backup foi versionado ou exposto pelo site.

Na restauração de ensaio, Prisma 7.10.0 aplicou a migration e `assertSchemaReady` passou. Foram preservadas as contagens das 27 tabelas existentes da aplicação. A comparação local também encontrou diferenças antigas de introspecção `NO ACTION`/`RESTRICT`, decorrentes de restaurar MariaDB em MySQL 9.2; nenhuma delas pertence à estrutura nova de Stories ou foi aplicada ao banco real.

A revisão privada foi vinculada ao fingerprint do banco e ao SHA-256 normalizado do SQL. A aplicação real usou `safeMigrate({apply:true})`, que adquiriu o lock de release, validou histórico/checksums/revisão, criou outro backup, verificou sua restauração em um segundo banco vazio e executou o **`prisma migrate deploy` instalado em 7.10.0**. O lock do próprio Prisma também permaneceu habilitado.

Aplicação concluída em **16/11/2026 às 17:03:15, America/Sao_Paulo**. Não houve atualização de versão do Prisma, alteração de destino do banco ou alteração no Supabase.

## Validação depois da aplicação

- `prisma migrate status`: 34 migrations; banco atualizado.
- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: **No difference detected**, exit 0, no banco real.
- `assertSchemaReady`: `compatible: true`, `missing: []`.
- Conferidas as duas FKs e os índices PK/únicos/não únicos no `information_schema` de produção.
- Contagens das 27 tabelas preexistentes comparadas ao backup mais recente, todas preservadas. Mantidos um Story e oito usuários; zero respostas novas. Nenhum conteúdo de teste foi inserido em produção.
- Leituras Prisma de `story` e `storyResposta` executadas com sucesso no banco real.
- Entrada de produção realmente iniciada contra uma restauração isolada, com Storage/Supabase de produção desabilitado e diretório de uploads privado de teste: `prisma migrate deploy` terminou antes de `server_listening`; `/health` respondeu 200; `/api/stories` sem token respondeu 401; consulta autenticada de Stories respondeu 200 usando um usuário já existente na cópia restaurada. Nenhum usuário fictício criado nesse teste.
- 13 testes de produção/configuração/segurança/pesquisa/entrada aprovados, seis de Stories/composição e 36 de regressão de funcionalidades aprovados: 55 no total. Os dois testes novos de entrada também fazem parte de `npm run test:production`.

## Correção permanente da entrada e Render

Arquivos de código alterados:

- `backend/scripts/start.js` (novo): com `NODE_ENV=production`, encaminha para `start-production.js`; desenvolvimento continua iniciando `server.js` diretamente.
- `backend/package.json`: `npm start` usa essa entrada; `test:production` inclui os testes da entrada.
- `backend/tests/start-entry.node.js` (novo): garante encaminhamento correto por ambiente e preservação do bloqueio de schema incompleto.
- `README.md` e relatórios: orientações e estado atualizado.

Configuração recomendada no Render:

| Campo | Valor |
| --- | --- |
| Root Directory | `backend` |
| Build Command | `npm ci --include=dev && npm run prisma:generate` |
| Start Command | `npm run start:production` |
| NODE_ENV | `production` |
| Health Check Path | `/health` |

Mesmo que o painel mantenha `npm start`, o novo commit o encaminha pelo fluxo protegido quando `NODE_ENV=production`. É preciso publicar este ajuste de código para ele entrar em vigor. A migration atual **já está aplicada**, portanto o próximo startup apenas conferirá o histórico e não repetirá o DDL.

Para migrations futuras, o fluxo continua exigindo `MIGRATION_REVIEW_FILE`, backup privado persistente (`BACKUP_DIR`), clientes MySQL configurados e banco isolado vazio de verificação (`BACKUP_VERIFY_DATABASE_URL`). O alvo de restauração usado não pode ser reaproveitado cheio; provisione outro vazio para a próxima aplicação. Não remova essas exigências para forçar o deploy.

A URL pública `https://voz-urbana-api.onrender.com/health` respondeu 200 durante a validação, mas ainda informou a revisão antiga `d26ccd4b5c1f112bb6c63d502f6b1b28627b84b5`. Isso confirma disponibilidade da versão ativa, **não** a publicação do novo commit nem o sucesso do deploy anteriormente falho. Sem acesso ao painel privado, os logs desse novo deploy não foram verificados. Após publicar, confira a revisão retornada e o evento `server_listening`, sem `database_startup_failed`.

A instância de MySQL local foi encerrada após o ensaio; backups e evidências de revisão/restauração ficaram em armazenamento privado externo ao repositório.
