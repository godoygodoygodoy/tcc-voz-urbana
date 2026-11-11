# Publicação e proteção de dados — Voz Urbana

## Investigação de 11/11/2026

Enviar apenas `frontend/dist` pelo FileZilla **não altera o MySQL** nem executa migrations. O frontend atual aponta para `https://voz-urbana-api.onrender.com`; o backend usa o MySQL externo definido em `DATABASE_URL`. Supabase armazena mídia, não uma segunda tabela de usuários.

A busca de pessoas falhava no banco real com **MySQL 1267**: incompatibilidade entre `utf8mb4_unicode_ci` e parâmetros `utf8mb4_bin` no `LIKE` do adapter. A correção usa SQL parametrizado e conversão explícita, sem alterar tabelas. As seis contas existentes foram encontradas em consultas somente de leitura. Nome e username são pesquisáveis; email/telefone não são pesquisados nem retornados. Não há filtro por publicações ou verificação de email.

Também havia riscos concretos: os testes Jest podiam limpar o banco do `.env`; migrations eram executadas a cada reinício no Render; falhas temporárias da API podiam deslogar usuários e aparecer como “sem publicações”. Esses caminhos foram protegidos. As migrations versionadas não contêm limpeza geral de usuários/publicações. Há atualizações de categorias e relações `ON DELETE CASCADE`, o que não comprova que ocorreram exclusões. Sem histórico do servidor, **não é possível afirmar a causa das perdas anteriores**.

O arquivo legado `backend/src/config/database.js` não é importado pelo servidor ativo. O runtime usa Prisma/MySQL; não há SQLite ativo a ser sobrescrito pelo dist.

## Backup e validação realizados

Backup completo, fora do projeto:

`C:\Users\Usuario\Documents\VozUrbanaBackups\voz-urbana-2026-11-11T22-02-47-969Z.sql`

O manifesto `.sql.json` registra SHA-256, tabelas, contagens e validação. O dump foi restaurado em uma **instância MySQL nova, isolada e local**, com eventos desligados: **16 tabelas e 272 registros**, com contagens conferidas. O servidor temporário foi encerrado. O MySQL da escola não recebeu migrations, importações, criação de tabelas, exclusões ou atualizações. Os diretórios `restore-check-*` guardam apenas a cópia de teste e logs privados.

O cliente MySQL 9.2 instalado não exportou rotinas do servidor antigo; foi usado o cliente MariaDB compatível já instalado. Arquivos `.partial` não são backups concluídos.

O dump guarda referências de mídia, **não os bytes dos objetos Supabase ou uploads locais**. Preserve o mesmo projeto/buckets e faça cópia independente desses arquivos. Nunca limpe buckets durante a publicação. Guarde também uma cópia criptografada dos backups fora desta máquina, com acesso restrito.

## Publicar pelo FileZilla

1. Em `frontend/`, execute `npm ci` e `npm run build`.
2. Confira `dist/deployment.json`. O destino deve ser a API acima. `deployment-target.json` bloqueia builds de produção para outra API sem revisão deliberada; trocar a API pode mostrar outro banco.
3. Na raiz, execute `node scripts/package-release.cjs`. O pacote `release-upload/<data>/frontend` contém somente o build; o backend fica separado, por lista permitida, sem `.env`, uploads, bancos, backups ou testes.
4. Envie **somente o conteúdo de frontend/** para `/tecti/2026/gpec03/` na escola. Envie assets antes de substituir `index.html`. Preserve o `.htaccess` remoto se ele não estiver no pacote. Não use sincronização que apague diretórios remotos de dados.
5. Não envie backend, SQL ou `.env` ao diretório público. Não importe dumps no phpMyAdmin para atualizar HTML/JS/CSS.
6. Confira a versão de `deployment.json` publicada. Antes de concluir que registros sumiram, confira a API, os logs do Render e contagens no phpMyAdmin.

**Pesquisa, autenticação e backup também exigem deploy do backend no Render. Enviar apenas o dist não publica essas correções. Esta atualização não exige migrations.**

## Separar código, configuração e dados

| Recurso | Armazenamento | Publicação |
| --- | --- | --- |
| Frontend | diretório público da escola | substituir pelo build |
| Backend | serviço Render | código, sem reset/seed |
| Configuração | painel Render ou arquivo externo via `DOTENV_CONFIG_PATH` | preservar; nunca FileZilla/Git |
| Tabelas | MySQL persistente da escola | nunca substituir ao atualizar código |
| Mídia nova | mesmos buckets Supabase | preservar objetos/referências |
| Uploads antigos | volume persistente externo ao checkout | preservar nomes e caminhos |
| Backups/identidade | armazenamento privado persistente e cópia externa | nunca servir por HTTP |

Em produção, `UPLOAD_DIR` deve ser absoluto e externo ao checkout. O Render já declara `/var/data/uploads`. Antes de mudar um caminho, copie os arquivos antigos preservando nomes. **Não altere o mountPath do disco existente para configurar backups**: isso pode deslocar os uploads. Backups precisam de destino privado persistente próprio, não filesystem efêmero do Render nem pasta pública de uploads.

Configure `PERSISTENCE_STATE_FILE=/diretorio/privado/persistente/identity.json` após confirmar os destinos atuais. A primeira inicialização fixa impressões digitais do MySQL, projeto Supabase, modo de storage e caminho de uploads; mudanças posteriores bloqueiam o startup. Troca de senha não muda a identidade. Não apague esse arquivo para contornar um alerta: uma migração de infraestrutura exige revisão.

## Habilitar backup automático no servidor

O agendador está implementado no backend: executa ao iniciar e por intervalo, sem sobrepor jobs no mesmo processo. **A ativação no servidor real ainda depende da configuração abaixo. O .env privado e o painel Render não foram alterados.**

No host do job, instale cliente MySQL 8 compatível ou MariaDB e configure:

```env
BACKUP_ENABLED=true
BACKUP_DIR=/armazenamento/privado/persistente/voz-urbana
BACKUP_INTERVAL_HOURS=24
MYSQL_BIN=/usr/bin/mysql
MYSQLDUMP_BIN=/usr/bin/mysqldump
# Somente para os clientes MariaDB:
MYSQL_CLIENT_FLAVOR=mariadb
```

Use a mesma `DATABASE_URL` e preserve TLS/CA. Não inclua senhas em comandos nem no frontend. Os clientes recebem senha apenas no ambiente do subprocesso. Tabelas não-InnoDB são bloqueadas para revisão de consistência por um DBA.

Se o Render não tiver cliente SQL e disco privado adequado, execute o job em um worker/servidor confiável com acesso ao MySQL da escola. Alternativamente use um único cron diário com configuração externa:

```cron
0 3 * * * cd /opt/voz-urbana/backend && DOTENV_CONFIG_PATH=/etc/voz-urbana/backup.env /usr/bin/node scripts/backup.js create >> /var/log/voz-urbana-backup.log 2>&1
```

Escolha um scheduler responsável por banco. Monitore `database_backup_completed`, `database_backup_failed`, espaço e cópia externa. O código **não apaga backups automaticamente**; defina retenção com o administrador após garantir cópias externas verificadas.

## Verificar e recuperar

Prepare um banco **vazio e isolado**, com eventos desligados, e configure `BACKUP_VERIFY_DATABASE_URL=mysql://usuario:senha@host-isolado/audit_restore_check`. O nome deve terminar em `_restore_check` e diferir do banco da aplicação.

Em `backend/`, execute `npm run backup:verify -- /caminho/backup.sql`. O verificador recusa destinos com tabelas existentes; não apaga nada. Ele confere checksum, importa no destino vazio, compara contagens e registra validação no manifesto. Para outra verificação, prepare outro banco vazio; não limpe produção.

Para recuperação real: interrompa escritas, preserve uma cópia do estado atual, restaure o backup escolhido em **outro banco** e confira usuários, publicações, relações e imagens. Só depois altere deliberadamente a conexão/identidade, com plano de retorno. Nunca importe por cima de produção como tentativa. Não use `reset`, `db push --force-reset` ou seed para recuperar dados.

## Migrations, testes e logs

`npm run prisma:deploy` sem `--apply` não altera nada. Após revisar as migrations e configurar a verificação isolada, `npm run prisma:deploy -- --apply` exige backup novo e restauração validada antes de chamar Prisma. Comandos suspeitos são bloqueados para revisão de DBA. O scanner é conservador e não substitui revisão humana; não impede SQL manual. Use credenciais de runtime sem privilégios de administração/DDL e credenciais de migration separadas.

Testes seguros sem banco: `cd backend && npm run test:safety`. Jest com fixtures de escrita exige banco descartável separado, `NODE_ENV=test`, `TEST_DATABASE_URL` terminado em `_test` e `TEST_DATABASE_ALLOW_CLEANUP=true`. Nunca use o banco da escola. O CI cria seu próprio banco `_test`.

Logs registram evento, código e horário sem corpo de requisição, credenciais ou conteúdo SQL. Preserve logs do serviço para correlacionar futuros incidentes com deploys, mudanças de ambiente e indisponibilidade.
