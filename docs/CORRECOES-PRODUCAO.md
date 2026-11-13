# Diagnóstico de produção — Voz Urbana

## Causa do conflito de collation

O diagnóstico usou somente leituras do banco configurado no ambiente. O servidor se identifica como **11.8.9-MariaDB-log**, acessado pelo protocolo MySQL. Não foi presumido que esse banco seja necessariamente a mesma instância configurada no painel privado do Render.

| Camada verificada | Resultado |
| --- | --- |
| Servidor e banco padrão | `utf8mb4_unicode_ci` |
| Conexão | `utf8mb4` / `utf8mb4_unicode_ci` |
| Tabelas `usuarios`, `problemas`, `notificacoes` | `utf8mb4_unicode_ci` |
| `usuarios.nome`, `usuarios.username`, `usuarios.email` | `utf8mb4` / `utf8mb4_unicode_ci` |
| `problemas.titulo`, `descricao`, `endereco`, `cidade`, `estado` | `utf8mb4` / `utf8mb4_unicode_ci` |

Não foram encontradas diferenças de collation nessas tabelas/colunas. Os campos ainda não presentes nesse banco, como `bairro` e `notificacoes.chave_evento`, não foram considerados existentes e nenhuma migração foi executada para criá-los.

O conflito foi reproduzido nas operações Prisma `usuario.count({where:{nome:{contains:termo}}})` e na mesma consulta sobre `username`, usando o protocolo binário padrão do adaptador. Essas operações geram `LIKE` parametrizado sobre `usuarios.nome` e `usuarios.username`.

O serviço `peopleSearch.js` já possui uma proteção específica: converte os padrões vinculados para `utf8mb4` e aplica `COLLATE utf8mb4_unicode_ci` aos dois operandos. Essa consulta funcionou antes da correção. Portanto, **não é correto afirmar que a implementação atual desse serviço foi a consulta específica registrada no Render** sem acesso ao log completo e à revisão publicada. Outros `contains` do Prisma, na administração e nos filtros geográficos, ainda estavam sujeitos ao problema. O código atual e a API publicada também apresentaram diferenças de roteamento.

Comparando os dois protocolos do adaptador contra o mesmo banco, as consultas falharam no protocolo binário e passaram no textual. A correção em `backend/src/config/prisma.js` ativa a opção oficial já disponível `useTextProtocol: true` do adaptador instalado. O driver continua recebendo valores separados e escapando os parâmetros; não há concatenação de SQL fornecido pelo usuário. Host, banco, credenciais, TLS e permissões permanecem iguais. Não há conversão de tabelas, `ALTER DATABASE`, alteração de índices ou migração de collation.

Após a correção, passaram as consultas `contains` dos oito campos textuais existentes acima, a pesquisa pública e uma pesquisa positiva baseada em cadastro existente. O diagnóstico registra apenas contagens e indicadores, sem nomes, IDs, credenciais ou tokens.

## Render e frontend

- O servidor já usa `process.env.PORT || 5000` e `app.listen(PORT, "0.0.0.0", ...)`. A porta 5000 é apenas fallback local.
- Havia um import de `routes/publicPeople.js`, arquivo inexistente e não utilizado. Ele foi removido. A pesquisa permanece no router existente `publicSocialRouter`, em `/api/social/users/search`; nenhum sistema paralelo foi criado.
- O log de inicialização exibia `http://localhost`. Agora registra `server_listening`, endereço de bind e porta, sem apresentar localhost como URL pública.
- `render.yaml` já configura Node, build, start e health check corretamente. `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` e `UPLOAD_DIR` continuam sujeitos à validação existente. `PORT` é fornecida pelo Render. A URL pública é a atribuída ao serviço Render, não o endereço de bind.
- `VITE_API_URL` determina a API do frontend **durante o build**. `.env.production` e `deployment-target.json` apontam para `https://voz-urbana-api.onrender.com`. O desenvolvimento continua usando `http://localhost:5000`; o build de produção valida seu destino.
- O manifesto publicado em `https://www.startnet.app.br/tecti/2026/gpec03/deployment.json` confirmou esse mesmo destino. O JavaScript publicado contém a origem Render e o envio de Bearer, sem `localhost:5000`. Nenhuma URL foi substituída.

## Autenticação e verificações externas

| Verificação na API publicada | Resultado |
| --- | --- |
| `GET /health` | 200, `{"status":"ok"}` após uma primeira tentativa que expirou |
| `GET /api/users/me`, sem token | 401, `Token não fornecido`, comportamento esperado |
| Mesma rota com token inválido | 401, `Token inválido ou expirado` |
| CORS com origem `https://www.startnet.app.br` | Origem autorizada no cabeçalho da resposta |
| Fetch real do site publicado para `/health`, em Chrome | 200, corpo legível pelo JavaScript |
| Fetch real para `/api/users/me`, sem token | 401 legível pelo frontend, sem erro de CORS |
| Pesquisa publicada sem token | 401; diverge da rota de pesquisa pública existente no código atual |

Durante a verificação de navegador, todas as requisições que poderiam alterar dados foram bloqueadas. Nenhuma conta de produção foi criada, nenhuma sessão foi forjada e nenhuma credencial foi exposta. Não havia uma sessão autenticada de produção disponível para confirmar um 200 protegido no domínio publicado.

O interceptor existente envia o token de `localStorage` como `Authorization: Bearer <token>`. Acesso direto pela barra do navegador não acrescenta esse cabeçalho automaticamente. A proteção das rotas privadas e a verificação de administrador no banco foram preservadas.

## Testes e arquivos desta correção

Os 11 testes isolados executados verificam configuração de produção/TLS, resolução de imports, porta/bind, envio do token pelo cliente, fallback local, autenticação válida/expirada/ausente, autorização administrativa, pesquisa e proteções contra testes destrutivos. Eles usam dados de teste apenas em memória e não substituem a validação autenticada de produção.

Arquivos de implementação alterados nesta correção:

- `backend/src/config/prisma.js`: protocolo textual do adaptador.
- `backend/src/server.js`: remoção do import inexistente e log correto do bind.

Suporte e regressão:

- `backend/scripts/diagnose-production.js`: metadados e pesquisas somente de leitura.
- `backend/tests/production-config.node.js`: configuração, imports e middleware real de autenticação com dependências isoladas.
- `frontend/tests/api-config.test.cjs`: cliente real Axios, destino de produção, cabeçalhos e ambiente local.
- `backend/package.json` e `frontend/package.json`: comandos de diagnóstico e testes.
- Este documento: evidências, limites e passos para publicação.

Comandos, em seus respectivos diretórios:

```text
backend:  npm run test:production
backend:  npm run diagnose:production
frontend: npm run test:api-config
```

O diagnóstico de banco deve ser executado com as variáveis do ambiente que se deseja verificar. Ele não executa migrations, seeds, exclusões ou atualizações. A busca de amostra não imprime dados do cadastro.

## Publicação e limites

As correções estão no código local; **nenhum deploy foi executado**. Os testes HTTP externos descrevem a versão que já estava publicada, não comprovam a publicação deste patch. O acesso ao painel e aos logs privados do Render não está disponível nesta sessão.

Após publicar a revisão correta do backend, executar o diagnóstico no ambiente Render e conferir `server_listening`, `/health`, pesquisa com a sessão normal do usuário e ausência de novos conflitos de collation nos logs. Não há necessidade de mudar collations nem de reconstruir o frontend para este patch, pois sua URL e interceptor já estão corretos.

Há alterações de expansão anteriores no workspace, com migrações próprias ainda pendentes. Elas não fazem parte desta correção e não devem ser aplicadas indiscriminadamente para tentar resolver o `LIKE`. Revisar o conjunto da revisão antes do deploy evita publicar funcionalidades que exijam tabelas ainda ausentes.
