# Praça, Radar da Cidade e Ligeirinho — auditoria e plano de execução

Auditoria inicial: 16/11/2026. Pedido de referência: anexo “EXPANSÃO COMPLETA DO VOZ URBANA — PRAÇA, RADAR DA CIDADE, REDE SOCIAL E IDENTIDADE DO LIGEIRINHO”. Este documento acompanha etapas; não declara a expansão inteira concluída.

## 1. Base e auditoria técnica

React 18, Vite 7, React Router, Zustand, componentes e CSS próprios, Leaflet, animações existentes e três idiomas centralizados. Express, Prisma **7.10.0**, MySQL como fonte de dados e Supabase Storage para arquivos. Sem troca de stack, redesign, duplicação de autenticação ou novo banco.

Leitura direta do banco, sem escrita: **34 migrations aplicadas**, `inspectSchema.compatible=true`, nenhuma tabela/coluna ausente. A correção anterior de startup continua no working tree e deve ser preservada. Esta etapa não precisa de mudança de schema/migration.

O backend separa rotas/serviços e possui autorização central em `socialGraph.js`, middleware JWT/admin, respostas paginadas, transações/locks, validação de mídia e rotas privadas de arquivos. A interface possui Avatar, SiteDialog/ConfirmDialog, FloatingFields, LocalizedToast, cards, mapas, componentes de acompanhamento e compartilhamento que devem ser ampliados.

### Inventário por funcionalidade

| Área solicitada | Estado encontrado | Evidência e próximo trabalho |
| --- | --- | --- |
| Praça | Área social existente com nome Feed | `FeedPage.js`, `SiteMenu.js`, `/feed`; aplicar nome próprio sem renomear variáveis/rotas |
| Navegação social | Início, pesquisa, mensagens, atividades, salvos e criação por hashes | Reutilizar `navItems`, `selectTab` e componentes. Planejar novas áreas sem botões que abram funções inexistentes |
| Publicações sociais | Parcial: publicações são registros de `Problema` | CRUD, categoria obrigatória, status urbano, imagens, apoios e comentários. Artigo/evento/vídeo não deve virar uma denúncia com categoria/status inventados |
| Descoberta | Parcial | Pesquisa de pessoas paginada com debounce; busca textual de posts filtra a página carregada no cliente, portanto não é busca global nem Explorar completo |
| Feed personalizado | Parcial | `feedListing.js`: páginas de até 15, cursor recente, sort por apoios e filtros. Sem preferências salvas, interesses ou recomendação controlável |
| Reposts | **Ausente como persistência** | “Republicar” chama `toggleShare` → `SharePublicationDialog`; não existe modelo de repost, autoria própria ou inclusão em perfil. Compartilhamento já existente será preservado |
| Notas temporárias | Ausente | Sem modelo/API/editor/expiração de notas |
| Colaborações | Ausente | Sem convites/aceitação/autoria compartilhada |
| Mapa/Radar | Mapa funcional; Radar próprio ausente | `HomePage`, `Map`, `HeatmapLayer`, `GeographyInsights`, `/api/geography`. Não basta renomear `/map` |
| Filtros geográficos | Existentes com limites | Estado/cidade/bairro, categoria/status/período e bbox aproximada de proximidade. Não apresentar bbox como distância exata; localização precisa só sob consentimento |
| Calor/indicadores | Existentes | Agregação real no backend, limite/truncamento explícito, comparação de períodos e categorias. Não são índice oficial de qualidade urbana ou ranking de cidades |
| Transformações | Parcial funcional | `ComparisonPanel`/`comparisons.js` e fotos antes/depois em `Imagem`. Expandir contexto/histórico e descoberta sem duplicar imagens |
| Histórico/acompanhamento | Funcional para problemas | `ProblemTrackingPanel`, `problemTracking`, `problemStatus`, `watching`, etapas, entregas e relacionados. Integrar ao Radar; preservar distinção oficial/comunitária |
| Confirmações | Funcionais | `ConfirmacaoProblema`, transação/limites. Não alteram automaticamente o status oficial |
| Comunidades/mural | Ausentes | Sem comunidade, membros, convite, moderação, visibilidade ou mural por região |
| Eventos/desafios/propostas | Ausentes como recursos próprios | Apoio/comentário/acompanhamento já existem para problemas, mas não equivalem a campanhas/eventos/propostas |
| Vídeos curtos/duetos/remix | Ausentes | Vídeo existe em Stories; isso não cria catálogo persistente, remix autorizado ou feed vertical |
| Playlists | Ausentes | `Colecao` organiza salvos, não playlists de autoria/vídeo |
| Estatísticas de criadores | Parcial | `ProfileStats` mede dados reais existentes. Não há alcance/view tracking de vídeo/crescimento histórico de seguidores; esses valores não podem ser inferidos retroativamente |
| Stories | Parcial, com grande base integrada | 24h, composição, câmera, textos/desenho/filtros, GIF/Apple preparados, votos/perguntas/sliders, visualizações e respostas pelo chat. Limitações em `STORIES-MIDIAS-2026-11-16.md` |
| Amigos Próximos | Ausente como lista gerenciada | Audiência `AMIGOS` significa follow mútuo; manter significado, criar a lista real antes de exibir o novo público |
| Mensagens | Individual funcional | `Conversa` possui dois participantes canônicos; cota cumulativa de três mensagens por remetente enquanto não mútuos, aplicada no backend. Sem grupo/reply/reação/read receipts/compartilhamento tipado |
| Canais/salas de áudio | Ausentes | Biblioteca Socket.IO instalada não equivale a sinalização WebRTC/SFU/TURN ou áudio real. Não expor transmissão fictícia |
| Artigos | Ausentes | Sem documento rico, rascunho, sanitização e publicação longa tipada |
| Perfis | Base funcional | Foto/capa/bio/apresentação, fixação, Stories, seguidores, conexões em comum, conquistas e stats. Ver perfil separado de editar; links/customização/abas novas pendentes |
| Coleções | Funcionais para salvos de problemas | `Colecao`/`ItemColecao`, público/privado, itens e paginação. Generalizar só após identidade comum de conteúdo; não criar segundo sistema de salvos |
| Notificações | Base funcional | Autor real, preferências, deduplicação, SSE com fallback e links; novos eventos sociais ainda precisam ser integrados após commit transacional |
| Reconhecimento | Existente, precisa revisão de critérios | `achievements.js` ainda inclui quantidade de relatos. Critérios futuros devem valorizar colaboração/qualidade, sem remover conquistas históricas nem incentivar volume de denúncias |
| Moderação | Administração parcial | Acesso admin, logs/status e gerenciamento existentes; sem bloqueio/silenciamento/report social com categorias/fluxo/recursos de apelação |
| Desempenho | Otimizações e baseline existentes | Cursor, 12 posts iniciais, carregamento sob demanda, variantes de imagem, polling visível, scheduler e perf report. Sem promessa de FPS/INP não medidos |

### Diferenças que impedem implementação por simples renomeação

`Problema` possui regras urbanas e várias relações (`Comentario`, `Voto`, `Imagem`, `PublicacaoSalva`, `Enquete`, histórico). Não criar “problemas” fictícios para armazenar artigos, vídeos ou eventos. Na etapa de dados, definir uma identidade canônica de conteúdo e extensões tipadas, preservando IDs/URLs e as relações legadas por migrações aditivas. Não copiar todas as publicações para outra tabela e manter duas fontes divergentes.

`Conversa(usuarioAId,usuarioBId)` garante unicidade e cota individual. Não remover essa restrição para acomodar grupos; ampliar o domínio de participantes sem permitir que mensagens individuais escapem das regras atuais.

Salvos não são reposts, coleção não é playlist, heatmap não é índice oficial e confirmação de usuário não é resolução administrativa. Essas distinções orientam persistência e interface.

## 2. Auditoria de todas as referências ao mascote

Busca textual em frontend, backend, Prisma/seeds, configuração, documentação e testes por `mascote`, `mascot`, `pombo`, `pigeon`, `personagem`, `ligeir` e `liger`, incluindo catálogo de três idiomas. **Não foi encontrado outro nome próprio anterior.** “Pombo”/“pigeon” são a identificação genérica atual. Não há ocorrência identificada do mascote em seed/backend, nomes de usuários, notificações persistidas ou mensagens de erro. Não foram lidos/alterados conteúdos de contas para substituir palavras.

| Ocorrência/contexto | Decisão |
| --- | --- |
| `ChristmasUnlockNotice.jsx`: “O pombo trouxe o Natal…” | Atualizar a tradução visível para “O Ligeirinho trouxe o Natal…” nos três idiomas; manter o mesmo gatilho e chave compatível |
| `PigeonLogo.js`: aria-label “Interagir com o pombo” | Atualizar a tradução para interação com Ligeirinho |
| `PigeonLogo.js`: alt genérico “Voz Urbana” na imagem do personagem | Tornar descritivo: Ligeirinho, mascote do Voz Urbana; nome da marca no wordmark continua Voz Urbana |
| `locales/interface.json`: duas mensagens acima × pt-BR/en/es | Seis valores visíveis atualizados, com nome próprio igual nos idiomas; chaves existentes preservadas |
| `Header.js`/`PigeonLogo.js`: import/componente e classes `pigeon-*`/`site-header-mascot` | Preservar nomes técnicos; são implementação/seletores, não nome visível antigo |
| `utils/christmasTheme.js`: `recordPigeonSound`, chave `voz-urbana-pigeon-sounds` e chaves de desbloqueio/tema/efeitos | Preservar para não perder estado/contagem/desbloqueio entre sessões |
| `frontend/index.html`: ícone `branding/mascote-voz-urbana.webp` | Preservar caminho e ícone |
| Arquivos `branding/mascote-voz-urbana.webp` e `audio/pombo.mp3`; script `optimize-public-images.cjs` | Preservar arquivos e referências; nenhum redesenho ou regravação |
| `frontend/christmas-palette.cjs`, `index.css`, `ChristmasEffects.jsx`: classes/skin/decoração | Preservar efeitos, iluminação, neve, gorro, tema e mecânica |
| `tests/browser-christmas.cjs`: seletor do rótulo acessível | Atualizar apenas o seletor para Ligeirinho |
| `tests/christmas.test.cjs`: função/chaves técnicas | Preservar e repetir regressão |
| `frontend/tests/HEADER-AUDIT.md`, `frontend/docs/PERFORMANCE.md`: referências históricas de auditoria/benchmark | Preservar como documentação histórica; não reescrever resultados passados |
| “LIGERINHO” no título de uma seção do pedido | Tratar como grafia divergente do título; identidade oficial solicitada é **Ligeirinho** |

Não há motivo para alterar nomes pessoais, conteúdo de usuários ou referências a personagens externos. Nenhuma substituição global será feita.

## 3. Plano técnico por etapas

### Etapa 1 — Auditoria e identidade

Registrar o inventário e decisões acima. Aplicar Praça à navegação principal, seção da landing page, título da área social e mensagens específicas de navegação/pesquisa. Manter `/feed`, hash routes, APIs, nomes de componentes e propriedades técnicas. Identificar Ligeirinho nos pontos auditados. Testar idiomas, navegação, compatibilidade de perfil, mobile e desbloqueio natalino. Sem migration.

### Base transversal de segurança — antes de ampliar alcance social

Antecipar parte da etapa 7: bloqueio bilateral, silenciamento/ocultação e preferências de menção/mensagens centralizados nos filtros de leitura e validação de gravação. Relatórios sociais com categorias, alvo tipado, motivo, estado de análise, decisões e log administrativo. Cobrir perfis, pesquisa, mídia, feed, mensagens, Stories, menções e notificações; bloquear apenas no frontend é insuficiente. A lista de decisões ainda não implementadas permanece explícita.

### Etapa 2 — Estrutura e conteúdo da Praça

Separar responsabilidade de shell/navegação, listagem, compositor, descoberta e mensagens do grande `FeedPage`. Reutilizar componentes atuais com um contrato de conteúdo consistente; definir extensão de publicação e interações antes de artigos/vídeos/comunidades. Introduzir repost persistido ligado ao original, comentário opcional, crédito e rechecagem de acesso; notas com expiração backend e audiência; colaboração por convite/aceite com controle do autor. Filtros salvos e preferências reais, recomendação explicável/controlável. Cursor e filtros aplicados **no backend**, inclusive busca de publicações.

Navegação planejada (não criar links antes do recurso): manter `/feed` e usar subcaminhos `/feed/explore`, `/feed/radar`, `/feed/videos`, `/feed/communities` e comunicação dentro do prefixo existente, com compatibilidade para hashes antigos. Evita roubar URLs de usuários atendidas por `/:username` (`/radar` poderia já ser um username). Perfil continua usando `profilePath`. Início/Explorar/Mensagens/Stories/Perfil devem abrir recursos reais, sem criar sistemas paralelos.

### Etapa 3 — Radar da Cidade

Construir experiência própria com mapa/lista/timeline sincronizados, usando Leaflet, filtros geográficos, calor e componentes de acompanhamento já existentes. Agregar fontes com identidade/tipo/tempo/permissão, reusar o mesmo filtro para marcadores e lista. Integrar transformações/antes-depois e histórico, com link ao caso original e indicação de fonte comunitária. Proximidade precisa de pré-filtro espacial indexado e cálculo real de distância se apresentado em quilômetros; bbox não será chamada de raio exato. Só coletar localização após ação explícita.

### Etapa 4 — Comunidades e participação

Comunidade pública/privada, membros únicos, pedidos/convites, papéis proprietário/admin/moderador/membro, regras e moderação. Conteúdo referencia publicações canônicas. Mural, desafios com prazo/progresso verificado e eventos com interesse/participação únicos. Sugestões usam apoio/discussão sem alegar decisão oficial. Rever critérios de conquistas com preservação dos desbloqueios antigos. Sem usuários, eventos ou progresso de exemplo na produção.

### Etapa 5 — Vídeos e criação

Mídia original privada no Supabase, referências/metadados/permissões no MySQL, processamento com limites e FFmpeg/ffprobe já adotados. Publicação com estado/processamento/idempotência. Feed vertical paginado e player com pausa fora da tela/aba. Interações compartilham o domínio de publicações. Playlists de criador referenciam vídeo, sem duplicar arquivos. Dueto/remix exigem autorização explícita de reutilização, referência/origem e rechecagem ao publicar/visualizar; nunca usar trecho privado removendo sua proteção. Estatísticas agregadas backend só com eventos observados desde a implementação, sem fabricar passado. Integrar Stories e manter a lista de limitações do editor.

### Etapa 6 — Comunicação e perfis

Ampliar mensagens para reply/reação/conteúdo compartilhado, leitura e busca paginada; grupos com participantes/roles sem quebrar a conversa individual ou a cota. Canais com ACL, moderação, envio limitado e notificações pós-commit. Artigos com documento estruturado/render seguro, limites, rascunhos e mídia validada, sem HTML arbitrário. Perfis e coleções ganham referências aos novos conteúdos conforme os contratos existirem. Preservar ver/editar perfil e indicadores de Stories.

Salas de áudio são uma dependência específica: avaliar sinalização WebRTC e necessidade de TURN/SFU para conectividade/escala. Antes de integrar provedor, documentar operação, limites, privacidade e eventual custo, sem contratar serviço ou apresentar sala “ao vivo” sem transmissão funcional.

### Etapa 7 — Regressão, desempenho e produção

Aplicar autorização em cada API e mídia; cobertura de anônimo, bloqueado, perfil privado, membro removido, mídia apagada, upload inválido, indisponibilidade e concorrência. Testes isolados com banco em memória permanecem padrão; ensaio de migrations em restauração separada quando necessário. Backup recente e verificado antes de aplicar migrations de produção, mantendo o gate SCHEMA_NOT_READY. Render executa o fluxo protegido antes de ouvir a porta.

Medir payload/contagem de requests/chunks/tempo de render e efeitos com conteúdo real disponível; não usar ausência de posts para declarar 60 FPS. Cada recurso terá cursor/limite, cancelamento, estados de falha e carregamento tardio. Nenhum indicador urbano será inventado; metodologia deve separar registros comunitários e dados oficiais.

## 4. Integrações e decisões de dados

- MySQL/Prisma seguem como banco principal. Supabase só armazena arquivos; segredos só no backend.
- GIPHY: chave Web pública dedicada previamente autorizada, requisições diretas, sem proxy/cache proibidos; IDs persistidos e atribuição oficial.
- Apple: chave privada de assinatura no backend, MusicKit oficial e referência musical; nunca extrair/gravar/incorporar áudio protegido. Catálogo para sincronização exige licença própria.
- Nenhuma API externa nova foi contratada ou configurada nesta etapa.
- Não criar tabelas provisórias nem migrar todos os modelos futuros em um lote especulativo. Cada conjunto terá schema aditivo, FKs/índices/unicidade, revisão e teste antes da aplicação.

## 5. Registro da primeira etapa

Estado inicial do Git: alterações anteriores de correção de startup/relatórios presentes e preservadas. O anexo é a instrução desta expansão; documentação histórica foi usada como evidência e não como confirmação de funcionalidades hoje ausentes.

### Etapa 1 concluída no código e validada

Implementado:

- Praça no menu principal, seção social da landing page, título principal de `/feed`, pesquisa, rótulo acessível de navegação, contagem contextual e ação de atualização.
- Ligeirinho na mensagem de desbloqueio natalino e no rótulo acessível; alt descritivo na imagem existente do mascote.
- Nomes próprios Praça/Ligeirinho preservados nos três idiomas. As duas chaves de tradução antigas do pombo permanecem para compatibilidade, mas seus valores visíveis agora usam Ligeirinho.
- Preservados `/feed`, hashes, `FeedPage`, `navFeed`, assets, tema, aparência, animações, formulário de problemas e acesso às demais áreas. Nenhum item de menu fictício para Radar/vídeos/comunidades foi acrescentado.

Reaproveitados: o feed existente, sua paginação/interações, catálogos i18n, layout, menu principal, mascote, som, preferências e mecanismo natalino. Sem novas dependências, tabelas, migrations ou integrações externas. Nenhum registro de produção foi modificado.

Arquivos desta etapa:

- `frontend/src/components/PigeonLogo.js`.
- `frontend/src/pages/FeedPage.js` e `LandingPage.js`.
- `frontend/src/i18n.js` e `locales/interface.json`.
- `frontend/tests/browser-christmas.cjs`: seletor atualizado para o rótulo novo.
- `frontend/tests/praca-identity-browser.cjs`: integração de identidade/navegação/desbloqueio nos três idiomas.
- `frontend/package.json`: comando `test:praca-identity:browser`.
- Este documento de auditoria/plano/entrega.

Testes executados:

- Build Vite de produção aprovado; 3.213 módulos, 8,56 s nesta execução. Mantém o warning anterior de chunk grande do cenário 3D; nenhum pacote novo.
- Auditoria de 1.176 chaves em três idiomas e cinco testes do motor i18n aprovados.
- Dois testes do tema natalino aprovados, incluindo persistência do desbloqueio e efeitos.
- Navegador Chrome: 15 grupos de verificações nos idiomas pt-BR/en/es, incluindo nome/alt/imagem original, menu → `/feed`, desbloqueio após três eventos de som, texto Ligeirinho, persistência após reload e ausência de overflow em 390×844 e 1440×1000. Zero erros JavaScript. A reprodução de áudio foi simulada somente no teste para exercitar o evento de desbloqueio; isso não é teste de alto-falante/dispositivo físico.
- Regressão de paginação do feed: 17 verificações, 40 publicações de fixture isolada e quatro consultas de feed, sem erros JavaScript. Não são publicações fictícias adicionadas à produção nem evidência de FPS real.
- Inspeção visual da captura móvel natalina; `git diff --check` aprovado.

Comparação de tamanho do build (bytes, mesmo ambiente):

| Chunk | Antes bruto/gzip | Depois bruto/gzip |
| --- | --- | --- |
| Entrada principal | 494.966 / 160.431 | 495.212 / 160.536 |
| FeedPage | 46.805 / 15.024 | 46.794 / 15.025 |
| StoriesRail | 19.283 / 7.045 | 19.283 / 7.049 |
| StoryComposer | 33.832 / 12.208 | 33.832 / 12.209 |

É uma mudança de textos/identidade, **não uma otimização com ganho de FPS, LCP ou INP demonstrado**. As pequenas diferenças de compressão também refletem novos hashes dos imports. Não foram adicionados loops, listeners, requests ou CSS de efeitos à interface.

### Pendências e próximo conjunto

Etapas 2–7 permanecem planejadas, não concluídas. O próximo conjunto é definir a autorização transversal (bloqueio/silenciamento/ocultação e moderação), o contrato canônico de conteúdo e o shell da Praça antes de implementar repost/notas/colaboração e busca global. Radar, comunidades, canais, artigos, vídeos/duetos/remix, eventos e salas de áudio ainda não foram implementados por este trabalho. Não houve deploy; o novo `dist` pertence a um novo build e deve ser publicado como conjunto consistente, sem misturar arquivos com o build anterior.

## 6. Continuação autorizada — implementação em andamento

Após a primeira entrega, o usuário autorizou expressamente todas as etapas restantes. O registro acima é o estado histórico da Etapa 1; o trabalho abaixo está em execução e ainda não constitui conclusão global.

**Escopo atualizado pelo usuário:** salas de áudio ao vivo ficam para o futuro. Não implementar agora, não contratar TURN/SFU e não apresentar controles de transmissão. Nenhuma sala de áudio foi criada; a dependência permanece apenas documentada.

### Conjuntos implementados/em validação

- Segurança transversal: relações de bloqueio/silenciamento, preferências de mensagens/menções, ocultação reversível de publicações, denúncias sociais por categoria, decisão administrativa com log. APIs em `/api/social-safety`; controles em perfil/configurações/publicações/comentários/Stories e fila administrativa. A autorização central foi ampliada para bloqueio bilateral; mensagens anteriores continuam legíveis, mas o envio é negado quando restrito.
- Radar próprio em `/feed/radar` e `/api/radar`: mapa e timeline de registros/atualizações, filtros, cursor com ordenação por data/ID/contexto, calor/análises existentes sob demanda e acesso ao histórico original. Atualmente agrega problemas e suas atualizações; eventos e conteúdo social de outros tipos ainda não existem para agregar.
- Notas: uma nota ativa por autor, até 140 caracteres, 1/6/12/24h, público validado no backend, edição e exclusão. Não são publicações permanentes nem dados simulados.
- Reposts persistidos: referência ao problema original, autor da republicação/comentário próprio, crédito, perfil/listagem, deduplicação, remoção própria, notificação com ator real e indisponibilidade do original sem revelar seu texto privado. O compartilhamento existente continua separado.
- Grupos/canais: extensão de `Conversa`/`Mensagem`, sem segundo sistema de chat. Participantes/papéis, escrita administrativa em canal, respostas à mesma conversa, reações e marcador de leitura. Cota de três mensagens aplicada por remetente/grupo enquanto não houver follow mútuo com todos os participantes; canais são administrados por usuários autorizados. Integração de interface/contagens e revisão de desempenho em andamento.

### Migrations preparadas — ainda NÃO aplicadas

1. `20261116190000_social_safety`: relações de segurança, ocultações, preferências e denúncias, todas com FKs/índices.
2. `20261116200000_notes_reposts`: notas temporárias e reposts; FK do original usa SET NULL para preservar o comentário próprio se o problema for removido.
3. `20261116210000_group_conversations`: campos de grupo/canal, participantes, reply/reação. Os campos legados A/B passam a aceitar NULL somente para grupos genuínos; nenhum ID/histórico/par direto é substituído. Essa alteração de nulabilidade exige revisão e ensaio específicos antes de produção.

**Produção continua nas 34 migrations anteriores. Não publicar o backend novo sem ensaio, backup/restauração verificada e aplicação das migrations revisadas. SCHEMA_NOT_READY permanece habilitado.** Não houve migração/remoção de dados de produção nesta continuação.

### Testes já executados nesta continuação

- Quatro testes de segurança social aprovados: bloqueio bilateral e APIs diretas, histórico preservado, silenciamento/ocultação sem apagar original, denúncias deduplicadas/ACL/log, preferências de mensagem.
- Dois testes de Radar aprovados: merge/cursor sem repetição, privacidade/bloqueio, update recente em problema antigo e rejeição de cursores/datas inválidos.
- Dois testes de notas/reposts aprovados: expiração, audiência, edição/autor, crédito, deduplicação e original privado/removido.
- Dois testes de grupos/canais e 14 de seguidores/chat HTTP aprovados após a primeira implementação: acesso, quotas individuais, replies, reações, papéis e histórico preservado. Refatoração de consultas agrupadas será revalidada.
- 36 regressões de expansão aprovadas após a primeira base de segurança; repetir ao finalizar os próximos conjuntos.
- Browser: seis fluxos aprovados (nota, repost, denúncia, ocultação, bloquear/desbloquear, rota Radar/mobile), com handlers reais em banco isolado de memória e zero erros JavaScript. 404 esperados ocorreram em requests de stats de um perfil que acabara de ser bloqueado; não são rotas ausentes.
- Catálogo passou com 1.254 chaves em três idiomas antes dos textos adicionais de grupos; repetir auditoria ao estabilizar. Foi corrigida colisão semântica de tradução de “Open” entre status urbano e denúncia usando rótulos contextualizados de denúncia.
- Prisma validate/generate 7.10.0 aprovados; builds intermediários aprovados. Ainda não há nova medição de FPS/INP nem comparação completa de desempenho desta expansão.

Colaboração, comunidades, eventos/desafios, artigos, vídeo/dueto/remix/playlists, novos dados de criador, feeds personalizados e demais conjuntos continuam em desenvolvimento/planejamento. Não marcar concluídos por existir apenas rota, modelo ou interface. Dependências Apple/GIPHY seguem as regras e configuração já documentadas.

## 7. Validação e atualização do banco — 16/11/2026

Esta seção atualiza o estado histórico da seção 6: **as quatro migrations abaixo foram ensaiadas e aplicadas em produção**. Não significa que toda a expansão foi concluída ou que o código foi publicado.

- `20261116190000_social_safety`.
- `20261116200000_notes_reposts`.
- `20261116210000_group_conversations`.
- `20261116220000_close_friends`: lista privada gerenciada pelo proprietário, com FKs para os dois usuários e unicidade do par. Stories e notas para `PROXIMOS` validam também privacidade do perfil, bloqueio e expiração. Remover da lista revoga o acesso; bloquear remove o par das duas listas, sem restauração automática após desbloqueio.

### Banco e processo de release

1. Backup integral recente criado fora do Git e restaurado em instância MySQL isolada, com scheduler desativado e bancos exclusivos de verificação.
2. As quatro migrations foram aplicadas à restauração usando o Prisma 7.10.0 instalado. Os registros das 28 tabelas existentes foram preservados; `assertSchemaReady` aprovado.
3. Inspeção do diff isolado: nenhuma divergência nas estruturas novas. As 32 instruções sugeridas pelo diff correspondiam a diferenças anteriores de introspecção (FKs NO ACTION/RESTRICT e JSON MariaDB representado como LONGTEXT na restauração MySQL). Não foram aplicadas essas instruções ao banco de produção.
4. Recibo privado de revisão vinculado ao fingerprint do banco e checksums das quatro migrations. O fluxo `safeMigrate` adquiriu o lock exclusivo, criou **outro backup** imediatamente antes da aplicação e verificou sua restauração em um segundo banco vazio.
5. `prisma migrate deploy` concluiu as quatro migrations no banco de produção. Verificação posterior somente de leitura: **38 migrations concluídas, zero migrations falhas, `inspectSchema.compatible=true`, nenhuma tabela/coluna ausente, diff real de produção vazio**. Contagens dos registros anteriores preservadas.

Não houve reset, db push, exclusão de registros, alteração global de collation ou desativação do gate de schema. O relaxamento de nulabilidade em `conversas.usuario_a_id/usuario_b_id` preservou os pares diretos existentes. O servidor isolado de ensaio foi encerrado após a validação; backups e recibos privados foram mantidos fora do repositório.

### Funcionalidade e regressão

- `npm run test:praca` no backend: 13 testes aprovados, incluindo bloqueio bilateral, listas de seguidores sem identidades bloqueadas, corpos históricos de notificações sem nomes restritos, replies em grupo sem texto de autor bloqueado, permissões de canal/grupo e revogação de Amigos Próximos.
- Regressões: 36 testes de expansão; 13 de configuração/segurança de produção; seis do ecossistema de Stories; quatro de paginação/mídia do feed. Suítes adicionais de seguidores e conexões também passaram.
- Chrome, fixtures isoladas: seis fluxos de Praça e seis de conversas/Amigos Próximos aprovados, sem erros JavaScript. Grupo criado pelo formulário real, mensagem gravada pelo handler real, reação persistida, reply vinculado, terceira mensagem bloqueando apenas o envio e preservando histórico, participantes carregados, lista próxima editada. Nenhum conteúdo de teste foi gravado na produção.
- Identidade: 15 verificações em pt-BR/en/es, mobile e desktop, incluindo desbloqueio natalino; paginação existente: 17 verificações, sem erros JavaScript; dois testes do tema natalino aprovados.
- Build de produção aprovado; auditoria de 1.286 chaves nos três idiomas e cinco testes do motor i18n aprovados. As ferramentas de conversas são carregadas sob demanda para não incorporar seu editor/gerenciamento ao carregamento inicial da Praça. O warning anterior do cenário 3D grande continua; não representa erro de build.
- Inicialização real pelo `scripts/start.js`, com `NODE_ENV=production`, **contra a cópia isolada**: `migrate deploy` antes do listen, `/health` OK, rota protegida sem token 401 e consultas autenticadas de Stories, lista próxima, notas, reposts, conversas e Radar 200. Não foi um teste de deploy remoto do Render nem de upload no Supabase.

Também foi corrigida a possibilidade de uma resposta de paginação antiga do Radar entrar na lista depois de mudar os filtros; conversas removidas saem da seleção durante atualização. Responder em canal sem permissão não ativa o botão de reply. Silenciamento e ocultação afetam a descoberta de notas/reposts, sem apagar seus originais.

### Limites atuais e continuidade

**Áudio ao vivo foi expressamente adiado pelo usuário.** Não há salas, botões de transmissão, contratação, dependência TURN/SFU ou configuração de provedor criada nesta implementação. A referência no plano é somente uma possibilidade futura.

Os conjuntos de colaboração, comunidades/mural/desafios/propostas/eventos, artigos, vídeos/duetos/remix/playlists/métricas e feeds personalizados continuam pendentes. Os canais atuais usam membros convidados e escrita administrativa; descoberta pública, ingresso livre, capas e enquetes próprias de canais ainda não foram implementados. Reações de outros participantes são recarregadas ao reabrir o histórico; o polling incremental atual busca mensagens novas.

Não houve commit, push, deploy no Render nem envio do `dist` ao hosting neste trabalho. Publicar o backend correspondente antes do frontend e enviar o build como conjunto consistente. Como este lote já está aplicado, `start:production` deve confirmar ausência de migrations pendentes e manter `SCHEMA_NOT_READY` habilitado. Migrations futuras continuam exigindo novo ensaio/recibo e backup verificado. Não há ganho de FPS/LCP/INP declarado para esta expansão sem medição.
