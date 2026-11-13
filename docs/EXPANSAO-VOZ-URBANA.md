# Expansão Voz Urbana — auditoria e execução

## Arquitetura preservada

React 18/Vite, React Router, Zustand, Tailwind/CSS próprios, Framer Motion, Leaflet, Three/Fiber e Lenis. Express/Prisma 7 com MySQL. Supabase Storage guarda arquivos, com referências no MySQL; não será usado como banco. Autenticação JWT e administração verificada por relação no banco. Três idiomas centralizados em `i18n.js` e `locales/interface.json`.

Componentes reutilizáveis: FloatingSelect/DatePicker/TimePicker/UploadField, Avatar, LocalizedToast, PasswordField, Card/Button, molduras `site-panel` e `context-modal`, modal paginado de rede, mapas e cartões de publicação. Há confirmação nativa na exclusão administrativa; será substituída por diálogo visual próprio reutilizável.

## Estado encontrado

| Área | Existente | Expansão necessária |
| --- | --- | --- |
| Social | Seguidores direcionais, solicitações privadas, amizade mútua, chat canônico com cota, conexões em comum | Stories, coleções, enquetes, conquistas |
| Atividade | Notificações, badge, marcar lida/todas, polling suspenso em segundo plano | Preferências, novos tipos, respostas/menções, deduplicação por evento |
| Publicações | CRUD, mídia protegida, categorias, curtidas, comentários paginados, antes/depois no modelo | Comparador, respostas, acompanhamento, confirmações, relacionados, timeline completa |
| Mapa | Leaflet, seleção poligonal, categoria/status/período/engajamento, localização | Calor real, cidade/bairro/estado combinados, agregados regionais e evolução |
| Perfil | Avatar, bio, privacidade, contagens, salvos próprios, relações em comum | Capa, destaques, medalhas, estatísticas recebidas corretas |
| Administração | Estatísticas reais, usuários/publicações, logs, CSV básico, regras de acesso | Moderação persistente, sinais de abuso, rankings filtrados, PDF/CSV seguro, status transacional |
| Comunidade | Dados de cidade/estado; bairro atualmente incorporado ao endereço | Comunidades por região, participação/discussões, canais oficiais verificados |
| Desempenho | Divisão por rota, mídia WebP, scheduler compartilhado, polling visível, paginação, testes antes/depois | Manter os ganhos e medir impactos dos recursos novos |

## Conflitos e decisões

- A enumeração atual de status tem quatro valores. Qualquer ampliação deve preservar valores e registros antigos, sem reinterpretar o passado ou inventar histórico.
- O endereço atual não guarda bairro separado. Novos registros podem guardar o bairro, mas dados antigos continuarão desconhecidos até edição; não será inferida uma localização fictícia.
- Salvos já têm unicidade por usuário/publicação. Coleções devem referenciar esses salvos e preservar toda a lista anterior.
- Stories não podem reutilizar URLs públicas de publicação: expiração, audiência e privacidade precisam ser verificadas a cada acesso à mídia, inclusive local.
- Os uploads atuais validam MIME, mas não assinatura do conteúdo; vídeos precisam de limites próprios e leitura em blocos/range.
- Atualização administrativa de status/histórico/log não é atômica atualmente. A expansão deve reuni-los em transação e notificar após confirmação.
- O CSV atual não é filtrado, baixa todos os registros e não neutraliza fórmulas de planilha. A exportação ampliada precisa corrigir esses pontos.
- Estatísticas públicas devem usar somente publicações de perfis públicos, sem inclusão privilegiada por visitante administrador. Dados insuficientes terão indicação explícita, sem ranking/índice inventado.
- Não há informações verificadas de órgãos públicos. O catálogo começará vazio e será preenchido por administradores; consultar um contato nunca será tratado como protocolo oficial.
- Migrações anteriores permanecem pendentes de revisão no fluxo seguro de banco. Novas migrações serão preparadas e validadas sem executar mudanças destrutivas ou testes no banco da aplicação.

## Sequência de execução

Auditoria → migrações aditivas e validações → conjuntos sociais completos → recursos geográficos → acompanhamento → perfil/compartilhamento → administração → comunidade → desempenho/acessibilidade → regressão final. Cada conjunto só será marcado concluído após integração de API, persistência, interface e testes; arquivos de migração preparados não equivalem a banco de produção migrado.

Este documento acompanha o trabalho em andamento e não afirma que os recursos ainda pendentes já foram entregues.

## Progresso da implementação (código e testes isolados)

- Coleções integradas aos salvos e ao perfil, incluindo coleções públicas/privadas, CRUD, itens e paginação. Testes de API e sete verificações de navegador aprovados; remover coleção/itens preserva os salvos.
- Stories de imagem/vídeo, audiência, expiração de 24 horas, visualização única por conta, exclusão e limpeza com repetição em caso de falha. Mídia privada com autorização reavaliada, vídeo em streaming/range e poster gerado por FFmpeg. Sete testes de validação/serviço/HTTP/mídia e sete verificações iniciais de navegador aprovados. Reações persistidas e abertura por link também aprovadas no navegador (oito verificações no total).
- Enquetes persistidas em publicações, resultados, encerramento e voto único por usuário. Dois testes de API e oito verificações de navegador aprovados.
- Central ampliada com preferências por tipo, paginação/filtros, contagem global de não lidas, deduplicação por chave e SSE autenticado com fallback por polling. Três testes de API/transação/SSE e sete verificações de navegador aprovados, com SSE HTTP real sobre banco isolado. A reconexão sincroniza as notificações para recuperar eventos perdidos.
- Respostas paginadas em um nível de discussão, menções e notificações que verificam acesso atual à publicação. Dois testes de API e fluxo de respostas/menções/recarregamento no navegador aprovados.
- Conquistas calculadas no backend e persistidas com unicidade; checagem limitada e agrupada em segundo plano. Critérios: primeiro registro, cinco registros, dez apoios de outras contas, dez acompanhamentos acessíveis, um registro marcado resolvido e participação em três discussões de outros autores. A data representa o desbloqueio efetivamente registrado, sem retroagir artificialmente. Dois testes de participação/acompanhamento aprovados. Nove verificações de navegador cobrem respostas, acompanhamento e conquistas públicas, bloqueadas próprias e privacidade.
- Acompanhamento reutiliza `publicacoes_salvas.acompanhando`, sem copiar publicações. Deixar de acompanhar preserva o salvo; exclusão de um salvo encerra o acompanhamento vinculado. Mudanças administrativas de status geram uma entrega persistida com cursor, processada em lotes de 50. O processamento respeita a privacidade atual e as preferências; parar de acompanhar preserva o salvo.
- Confirmações nativas de exclusão no feed/admin substituídas pelo diálogo visual reutilizável. Seletores flutuantes corrigidos para teclado e camadas dentro de modais.

A pedido do usuário, continuar com testes isolados em memória. Não há autorização implícita para usar o banco da aplicação como banco de testes. Nenhuma migração desta expansão foi aplicada em produção. Schema Prisma validado; a geração do client será repetida quando os modelos do conjunto estiverem estabilizados.

Vídeos exigem os executáveis `ffmpeg` e `ffprobe` no servidor, ou `FFMPEG_PATH` e `FFPROBE_PATH`. Há erro de indisponibilidade explícito se faltarem; não há publicação de vídeo fictícia. Arquivos de vídeo limitados a 20 MB/60 segundos; fotos a 5 MB. Stories usam o bucket `posts`, sem novo bucket. A privacidade é validada em cada leitura e expiração não depende da limpeza física periódica.

Continuam pendentes os recursos geográficos avançados, workflow/timeline/confirmação comunitária, personalização e estatísticas completas do perfil, moderação/rankings/relatórios, Cidade em Números/índice, comunidades/canais oficiais e a rodada final de desempenho/acessibilidade/regressão. Este progresso não significa entrega completa da expansão.

## Continuação: status e recursos geográficos

- Status administrativo, histórico existente, log, notificação do autor e fila de entrega gravados em uma transação. Repetir o mesmo status não inventa eventos. Quatro testes aprovados: autorização HTTP, concorrência/idempotência, rollback e retomada de lotes sem duplicar destinatários. O fluxo configurável ampliado ainda está pendente; os quatro valores legados foram preservados.
- Campo de bairro separado e índice regional preparados por migração aditiva, sem inferir ou alterar endereços antigos. Criação/edição e serialização incorporam o campo.
- Filtros compartilhados no backend para categoria, estado, cidade, bairro, status, datas UTC, participação e área aproximada por localização autorizada. Lista, marcadores, mapa de calor e análise usam os mesmos critérios.
- Densidade agregada via Prisma/SQL sobre todos os registros acessíveis, independente da página; limite explícito de 2.000 posições, com contagem representada e aviso ao truncar. Canvas desenha apenas após dados/movimento/resize, sem loop permanente, sem blur de CSS e com um pixel por pixel de tela. Listas continuam paginadas; marcadores limitados a 100.
- Análise regional sob demanda, comparação com período anterior de mesma duração, oito intervalos reais de criação, distribuição atual por status/categoria e até 20 regiões. A metodologia distingue registros históricos de criação do status atual; não inventa histórico de resolução. Não é a futura página pública Cidade em Números. Dois testes de API e seis verificações móveis de navegador aprovados, incluindo ausência de nova consulta de calor ao paginar cartões.
- Corrigida a recentralização repetida do Leaflet e sanitizada a cor interpolada no HTML do marcador. A limpeza de avatares agora exige bucket e proprietário corretos, inclusive contra caminhos codificados e origens parecidas.

Schema Prisma validado e client gerado novamente. Build de produção aprovado. A auditoria estática verifica 947 chaves em três idiomas; testes do motor de idioma, tema natalino e scheduler/polling aprovados. Isso não substitui a rodada final completa nem medições reais antes/depois da expansão. Não foram executadas migrações nem usados dados de produção.

Última regressão desta continuação: 25 testes da expansão aprovados, 26 verificações de serviços sociais/perfil/desempenho/status aprovadas (com sobreposição de cenários), seis testes de segurança de dados/pesquisa e 94 verificações de navegador de i18n em três idiomas. Motor i18n, tema natalino e scheduler/polling: nove testes aprovados; sanitização de cor do mapa: um. Fluxos novos no navegador: oito verificações de stories, sete de atividades/SSE, nove de discussão/acompanhamento/conquistas e seis geográficas. Nenhum erro de execução do navegador nos fluxos aprovados. A integração com MySQL real continua deliberadamente sem execução, conforme a preferência do usuário.
