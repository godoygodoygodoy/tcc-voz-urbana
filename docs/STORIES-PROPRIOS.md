# Correção dos próprios Stories — 16/11/2026

## Causas

- A faixa renderizava um botão de criação com avatar e, separadamente, o grupo de Stories do autor. Publicar criava duas representações da mesma pessoa.
- O serializador marcava qualquer Story do autor como visualizado automaticamente; o endpoint de visualização não gravava visualizações do próprio autor.
- A página de descoberta tem limite de 30 Stories. Os próprios Stories podiam ficar fora dessa página, impedindo o círculo de representar corretamente seu estado.

## Correção

- Um único círculo próprio, com botões irmãos para a foto e o `+`, sem botões aninhados. Sem Stories, ambos abrem a criação; com Stories, somente a foto abre o visualizador. O `+` continua abrindo o editor.
- Grupo próprio removido da lista dos demais autores. A mesma renderização atende zero, um ou vários Stories.
- Sequência cronológica por data e ID; abertura no primeiro Story ainda não visualizado, ou no primeiro da sequência quando todos já foram vistos.
- A listagem da faixa inclui `ownStories`, uma consulta limitada aos 20 próprios Stories ativos permitidos pelo sistema, independente da página de descoberta. As URLs usam o mecanismo de tickets de mídia já existente. Não se carregam ilimitadamente Stories de outros autores.
- Visualização própria persistida na tabela existente `stories_visualizacoes`, com o mesmo upsert e unicidade `(story_id, usuario_id)`. Sem novas tabelas, colunas ou migrations.
- `viewed` depende do registro do espectador autenticado, inclusive para o autor. A publicação começa não visualizada; cada Story mantém seu estado independente. A interface atualiza o grupo ao registrar a visualização.
- Visualizações próprias ficam fora da contagem e da lista de espectadores, preservando as estatísticas anteriores. Curtidas próprias continuam proibidas; privacidade e expiração continuam validadas pelo backend.
- Mantidos os componentes, anéis, cores e tema natalino existentes. O CSS foi limitado ao posicionamento do `+` no único avatar próprio.

## Validação

- Backend: sete testes específicos de Stories/API/espectadores, incluindo persistência por Story, concorrência/idempotência, independência entre autor e outro espectador e próprios Stories fora da primeira página.
- Regressões: 38 testes de expansão e seis do ecossistema de Stories aprovados.
- Chrome com handlers e armazenamento isolados: cinco grupos específicos de próprios Stories, oito verificações dos fluxos anteriores e oito do editor/perfil aprovados. Incluem publicação de múltiplos Stories, foto versus `+`, avanço cronológico, anel persistido após reload, novo Story, contagem externa, curtida, exclusão, mobile/desktop e tema natalino. Nenhum registro de teste foi gravado em produção.
- Build de produção aprovado. O aviso anterior de chunks grandes permanece.

## Arquivos desta correção

- `backend/src/services/stories.js`, `backend/src/routes/stories.js`.
- `backend/tests/stories.node.js`, `backend/tests/helpers/socialMemory.js`.
- `frontend/src/components/StoriesRail.js`, `frontend/src/index.css`.
- `frontend/tests/own-stories-browser.cjs`, `stories-browser.cjs`, `story-composer-browser.cjs`, `story-ecosystem-browser.cjs`.
- `frontend/package.json`: comando `test:own-stories:browser`.
- Este relatório.

Não houve alteração no banco de produção, migração, commit, push ou deploy por esta correção. Publicar o backend e o frontend correspondentes para disponibilizar a nova lógica em produção.
