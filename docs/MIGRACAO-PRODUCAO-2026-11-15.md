# Compatibilidade do banco de produção — 15/11/2026

## Causa e identificação

O usuário confirmou que `backend/.env` aponta para o mesmo banco de produção usado no Render. A conexão real identifica MariaDB 11.8.9, via protocolo MySQL, no provedor externo; Supabase continua sendo somente Storage. Não houve substituição de banco, credenciais ou URLs.

O histórico tinha 19 migrações concluídas, nenhuma falha e 12 migrações pendentes. Todas as tabelas/colunas apontadas por `SCHEMA_NOT_READY` já tinham SQL nessas migrações. O bloqueio de inicialização estava correto. Seis diferenças de checksum observadas inicialmente eram apenas LF/CRLF: o conteúdo normalizado correspondia ao histórico; nenhuma migração aplicada foi editada.

## Backup e ensaio

Foram criados backups integrais privados fora do checkout, com SHA-256, inventário de linhas e objetos. O backup imediatamente anterior à aplicação foi:

`C:\Users\Usuario\Documents\VozUrbanaBackups\voz-urbana-2026-11-16T01-04-32-422Z.sql`

O horário no nome é UTC, correspondente a 15/11 às 22:04 em Brasília. O manifesto `.sql.json` registra a restauração verificada das 16 tabelas e suas contagens. Os backups e snapshots não foram adicionados ao Git nem enviados a outro serviço.

O MySQL 9.2 instalado foi usado como servidor de ensaio novo, restrito a 127.0.0.1, com diretório separado, senha aleatória e event scheduler desativado. Houve um primeiro backup de ensaio e outro novo antes da aplicação, cada qual restaurado em schema isolado vazio. A produção tem zero rotinas, eventos e triggers. O helper agora omite `--routines` somente quando essa ausência foi confirmada; a opção do cliente MySQL 9 consultava `information_schema.LIBRARIES`, inexistente no MariaDB. Se houver rotinas, sua inclusão continua obrigatória e um cliente compatível é necessário.

As 12 migrações existentes passaram no ensaio. A migração adicional de índice passou após corrigir, exclusivamente no ensaio, uma colisão de nome com um índice legado de uma coluna. A tentativa sem DDL aplicado foi marcada como revertida apenas no banco isolado. Não houve falha de migração em produção. O MySQL 9 normaliza algumas ações RESTRICT para NO ACTION na restauração; essas diferenças não foram transportadas para a produção. A comparação final foi feita diretamente no MariaDB real.

## Migrações aplicadas em produção

Aplicação pelo CLI **Prisma 7.10.0**, usando `prisma migrate deploy`, após revisão do SQL/checksums, backup novo e restauração verificada:

1. `20261112090000_followers_privacy`
2. `20261112110000_feed_performance`
3. `20261112130000_saved_collections`
4. `20261112140000_stories`
5. `20261112150000_publication_polls`
6. `20261112160000_activity_preferences`
7. `20261112170000_comment_replies`
8. `20261112180000_achievements_watch`
9. `20261112190000_status_delivery`
10. `20261112200000_neighborhood`
11. `20261112210000_problem_tracking`
12. `20261112220000_profile_features`
13. **Nova:** `20261116010000_visit_user_date_index`, adiciona `visitas_usuario_data_idx(usuario_id, criada_em)` e preserva o índice legado que sustenta a FK.

A migração de seguidores preservou os IDs/linhas originais: a amizade aceita ganhou a direção recíproca e a solicitação pendente legada tornou-se acompanhamento de perfil público. Não foram criados usuários, publicações ou mensagens de teste em produção. Não foram usados reset, db push, seed ou remoção de estruturas de produção.

## Ajustes do Prisma e execução

- Mapeados os dois campos legados de recuperação de senha com `@ignore`, preservando as colunas/índice sem expor os hashes em resultados ORM ou alterar o fluxo de autenticação.
- `Log.id` corresponde ao CHAR(36) existente; a FK de entregas usa o nome definido na migração.
- O índice composto de visitas foi alinhado ao Prisma. Removida apenas a declaração redundante do índice implícito de `problemas.usuario_id`, que o MariaDB substitui pelos índices compostos que já sustentam a mesma FK; nenhuma FK foi removida.
- CLI, cliente e adaptador fixados em **7.10.0**, inclusive lockfile. Não foi instalada a versão 8 RC.
- `safe-migrate.js` exige revisão de **todas** as migrações pendentes, vinculada ao fingerprint do banco e SHA-256 normalizado do SQL; confere histórico/checksums, recusa falhas anteriores e histórico incompleto. Ações declarativas ON DELETE/UPDATE não são mais confundidas com comandos DML pelo diagnóstico.
- Bloqueio nomeado no banco engloba revisão, backup/restauração e deploy; o bloqueio nativo do Prisma também permanece ativo.
- `start:production` valida a configuração, executa o fluxo de migração e só depois inicia o servidor. O servidor mantém a verificação `SCHEMA_NOT_READY` antes de ouvir a porta ou iniciar workers. Sem migrações pendentes, não exige novo backup para reiniciar.

## Validação realizada

- Conexão real, diagnóstico de schema e histórico: compatível, **32 migrações concluídas, nenhuma pendente ou falha**.
- `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`: **empty migration**, sem drift no banco de produção.
- Comparação dos **311 registros originais em 15 tabelas de aplicação**, por ID e valores das colunas anteriores: nenhuma exclusão ou alteração imprevista; conversão de relacionamentos validada separadamente.
- **39 chaves estrangeiras** verificadas, inclusive compostas: zero referências órfãs.
- Consultas Prisma executadas com sucesso nos 12 novos modelos, sem inserir registros.
- Backend iniciado realmente pelo novo `start:production` em porta local 5057, usando o banco real: `server_listening`, sem `SCHEMA_NOT_READY`; nenhum seed executado.
- HTTP com um perfil público existente: health, perfil, estatísticas, seguidores, seguindo e pesquisa retornaram 200. SSE, conexões em comum e administração sem token retornaram 401, preservando autenticação.
- Suítes `test:production`, `test:profile-routes`, `test:followers`, `test:expansion`: todas passaram. Os testes de mutação/permissões usam isolamento em memória; não foram executadas fixtures contra produção. Bloqueio real de duas execuções concorrentes testado no servidor isolado.

Não foi usada sessão de usuário nem fabricado token para acessar endpoints autenticados em produção. Fluxos autenticados e alterações de funcionalidades foram cobertos pelos testes isolados; ainda precisam de confirmação na sessão real do site após o deploy.

## Publicação e requisitos para próximas migrações

O `render.yaml` e o README agora especificam **Start Command: `npm run start:production`**. O Dashboard precisa usar esse mesmo comando ao publicar este código. Build: `npm ci --include=dev && npm run prisma:generate`; health: `/health`. O comando antigo `npm run prisma:deploy && npm start` continua inválido porque a ferramenta manual recusa execução sem `--apply`.

Para futuras migrações pendentes, configurar no ambiente executor:

- `MIGRATION_REVIEW_FILE`: JSON privado com `version:1`, `databaseFingerprint`, `rehearsedAt` e `migrations:{nome:sha256DoSQLNormalizadoLF}`, produzido após revisão/ensaio. O manifesto desta execução está junto aos arquivos privados de validação; ele não aprova SQL futuro.
- `BACKUP_DIR`: diretório privado persistente fora do checkout, sem exposição por `/uploads`.
- `MYSQL_BIN`, `MYSQLDUMP_BIN` e, se necessário, `MYSQL_CLIENT_FLAVOR=mariadb`: clientes nativos instalados e compatíveis com o servidor.
- `BACKUP_VERIFY_DATABASE_URL`: schema vazio em instância **isolada**, terminando em `_restore_check`, com event scheduler OFF. Uma restauração anterior não torna o mesmo schema vazio para a próxima execução; preparar outro schema isolado vazio sem limpar produção.

Não foram presumidos clientes nativos, disco privado ou servidor de restauração disponíveis no Render. Se faltar qualquer requisito diante de SQL pendente, a publicação para antes de gravar o schema; pode-se executar o mesmo fluxo em uma estação de manutenção configurada, validar e depois iniciar o serviço. Nenhum desses recursos é exigido no caminho sem migrações pendentes, como o estado atual do banco.

O health público do Render retornou 200, mas apenas `{"status":"ok"}`, sem contrato/revisão da versão atual. Portanto, isso **não confirma publicação deste código**. Sem sessão autenticada/API do Render nesta execução, não foram alterados o Dashboard nem o deploy, e não foi possível conferir logs privados. Pendência: publicar os arquivos atuais, alinhar Start Command e conferir `apiContract`, `revision`, `server_listening` e os fluxos autenticados no serviço publicado.

## Arquivos modificados nesta correção

`backend/prisma/schema.prisma`, nova migração de visitas, `backend/scripts/lib/mysqlTools.js`, `backend/scripts/safe-migrate.js`, `backend/scripts/start-production.js`, `backend/scripts/check-deployment.js`, `backend/tests/data-safety.node.js`, `backend/.env.example`, `backend/package.json`, `backend/package-lock.json`, `render.yaml`, `README.md` e os documentos deste diagnóstico. Scripts temporários de operação foram removidos do checkout após a validação; backups e evidências privadas foram preservados fora do repositório.
