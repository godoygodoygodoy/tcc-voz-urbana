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

As pendências atuais estão consolidadas no checklist ao final deste documento. Os registros anteriores descrevem a sequência da implementação; não devem ser interpretados como se as funcionalidades concluídas posteriormente ainda estivessem ausentes. A expansão inteira ainda não está concluída.

## Continuação: status e recursos geográficos

- Status administrativo, histórico existente, log, notificação do autor e fila de entrega gravados em uma transação. Repetir o mesmo status não inventa eventos. Quatro testes aprovados: autorização HTTP, concorrência/idempotência, rollback e retomada de lotes sem duplicar destinatários. O fluxo configurável ampliado ainda está pendente; os quatro valores legados foram preservados.
- Campo de bairro separado e índice regional preparados por migração aditiva, sem inferir ou alterar endereços antigos. Criação/edição e serialização incorporam o campo.
- Filtros compartilhados no backend para categoria, estado, cidade, bairro, status, datas UTC, participação e área aproximada por localização autorizada. Lista, marcadores, mapa de calor e análise usam os mesmos critérios.
- Densidade agregada via Prisma/SQL sobre todos os registros acessíveis, independente da página; limite explícito de 2.000 posições, com contagem representada e aviso ao truncar. Canvas desenha apenas após dados/movimento/resize, sem loop permanente, sem blur de CSS e com um pixel por pixel de tela. Listas continuam paginadas; marcadores limitados a 100.
- Análise regional sob demanda, comparação com período anterior de mesma duração, oito intervalos reais de criação, distribuição atual por status/categoria e até 20 regiões. A metodologia distingue registros históricos de criação do status atual; não inventa histórico de resolução. Não é a futura página pública Cidade em Números. Dois testes de API e seis verificações móveis de navegador aprovados, incluindo ausência de nova consulta de calor ao paginar cartões.
- Corrigida a recentralização repetida do Leaflet e sanitizada a cor interpolada no HTML do marcador. A limpeza de avatares agora exige bucket e proprietário corretos, inclusive contra caminhos codificados e origens parecidas.

Schema Prisma validado e client gerado novamente. Build de produção aprovado. A auditoria estática verifica 947 chaves em três idiomas; testes do motor de idioma, tema natalino e scheduler/polling aprovados. Isso não substitui a rodada final completa nem medições reais antes/depois da expansão. Não foram executadas migrações nem usados dados de produção.

Última regressão desta continuação: 25 testes da expansão aprovados, 26 verificações de serviços sociais/perfil/desempenho/status aprovadas (com sobreposição de cenários), seis testes de segurança de dados/pesquisa e 94 verificações de navegador de i18n em três idiomas. Motor i18n, tema natalino e scheduler/polling: nove testes aprovados; sanitização de cor do mapa: um. Fluxos novos no navegador: oito verificações de stories, sete de atividades/SSE, nove de discussão/acompanhamento/conquistas e seis geográficas. Nenhum erro de execução do navegador nos fluxos aprovados. A integração com MySQL real continua deliberadamente sem execução, conforme a preferência do usuário.

## Continuação: acompanhamento, perfil e compartilhamento

Implementação local, com migrações preparadas e testes isolados. Não equivale à publicação nem à aplicação das migrações no MySQL de produção.

### Acompanhamento e antes/depois

- Seis etapas padrão: Registrado, Em análise, Encaminhado, Em andamento, Resolvido e Não confirmado. Administradores podem configurar nomes, cor, disponibilidade e associação aos quatro status legados, além de cadastrar etapas próprias. O formulário fica em Administração → Problemas urbanos; a alteração de uma publicação fica no seu detalhamento. Usuários comuns não podem configurar ou aplicar etapas.
- As etapas padrão são configurações de fluxo, não registros fictícios de atividade. Nenhuma etapa é aplicada retroativamente aos registros antigos. O novo campo é opcional; a enumeração antiga e os dados existentes são preservados.
- Alterações de etapa reutilizam a transação de status, o histórico existente, a auditoria e as notificações persistidas aos acompanhantes. O histórico registra ator, data, status anterior e nome/código da etapa naquele momento. Renomear uma etapa não reescreve eventos antigos. “Encaminhado” é uma indicação administrativa manual; não executa envio a um órgão público.
- Linha do tempo reúne criação, comentários e atualizações existentes, com paginação por cursor e autorização reavaliada. Não inventa o primeiro status de publicações antigas. Comentários mantêm o texto original. A criação de uma comparação registra um evento com o responsável.
- Publicações relacionadas exigem categoria em comum, bairro/cidade/estado iguais ou proximidade aproximada por coordenadas. São retornados até 12 registros acessíveis, com o motivo da relação. Não há preenchimento com publicações aleatórias.
- Confirmação comunitária mantém uma observação por conta/publicação, alterável após 24 horas. Repetir a mesma escolha é idempotente. Contagens são calculadas no backend e não alteram o status oficial. O resumo não divulga a lista de pessoas que confirmaram.
- Upload de um par de fotos antes/depois por autor ou administrador, usando o bucket `reports` e o modelo `Imagem` existente. O comparador permite escolher imagens e usar o controle deslizante pelo teclado. Fotos continuam ligadas ao registro, com comentários e interações preservados. Novas fotos não são tratadas como prova automática de resolução.

### Perfil

- O cabeçalho agora conta apoios recebidos em publicações do perfil, corrigindo a contagem anterior de votos dados pela pessoa.
- Estatísticas de publicações, seguidores, seguindo, apoios/comentários recebidos e registros atualmente marcados como resolvidos. Acompanhamentos são uma informação privada exibida somente ao próprio usuário. Perfis privados exigem acesso aprovado.
- Apresentação de até 120 caracteres e capa de até 5 MB. A descrição/bio existente permanece no formulário original. A capa usa o bucket privado `covers`, com fallback local e URL mediada; a privacidade e o acesso são verificados em cada leitura. A limpeza aceita apenas arquivos do bucket e proprietário corretos. Não há exposição da URL bruta do Storage.
- Fixação de até três publicações próprias, validada com bloqueio transacional do usuário. Nem administradores podem fixar conteúdo alheio no próprio perfil. As fixadas aparecem primeiro e identificadas como destaque. Desafixar preserva o conteúdo e suas interações.
- URLs mediadas de imagens/capas permanecem estáveis em janelas de cinco minutos para evitar novo download a cada polling, mantendo a expiração e a verificação de acesso no servidor.

### Compartilhamento externo

- Feed e detalhe usam o mesmo diálogo de compartilhamento, com opção nativa, cópia de link e links para WhatsApp, Facebook e X. No Instagram, o fluxo orienta a usar o compartilhamento do dispositivo ou colar o link; não simula uma integração inexistente.
- Link permanente de prévia em `/share/problem/:id`, metadados Open Graph e imagem pública mediada. O link leva à publicação original com a subpasta correta do frontend. Título e descrição do usuário são escapados no HTML, sem tradução do conteúdo.
- Prévias e imagens exigem perfil público mesmo para autores e administradores. Mudar a privacidade bloqueia novas leituras do link e da imagem; arquivos privados não são expostos por URLs brutas ou tokens pessoais. O comportamento de caches de redes externas depende dos respectivos serviços.
- A origem pública utiliza `RENDER_EXTERNAL_URL` ou `PUBLIC_API_URL`, quando disponíveis, e a URL do aplicativo usa `FRONTEND_URL`. Não houve substituição do domínio configurado nem publicação automática.

### Migrações e validação deste conjunto

- `20261112210000_problem_tracking`: tabela de etapas, vínculo opcional da publicação, snapshots de histórico e confirmações comunitárias.
- `20261112220000_profile_features`: apresentação, referência da capa, data de fixação e índice de destaques.
- Ambas são aditivas e estão somente preparadas. Nenhuma migração, seed ou alteração de dados de produção foi executada nesta continuação.
- Prisma validado e client gerado. Build de produção aprovado. 34 testes da expansão aprovados; nove são novos cenários de API para acompanhamento, perfil e compartilhamento. A regressão adicional de autenticação/seguidores/perfis totalizou 29 testes, com sobreposição de cenários. Motor de idioma, versão natalina e scheduler/polling: nove testes aprovados.
- Dez verificações de navegador aprovadas para fixação, upload/comparação, confirmação, etapa oficial/timeline, capa/apresentação, perfil/estatísticas, compartilhamento público, bloqueio privado, configuração administrativa de etapas e layout desktop. Os fluxos principais também foram exercitados em viewport móvel; as capturas de perfil móvel/desktop foram inspecionadas, sem overflow horizontal. Sem erros de execução no navegador.
- Auditoria estática de 1.035 chaves em três idiomas e 94 verificações de navegador de i18n aprovadas. A auditoria também passa a detectar caracteres substituídos por falhas de codificação nos catálogos.

## Checklist atual — código local e pendências

| Conjunto | Situação |
| --- | --- |
| Stories, coleções, atividades, conquistas e enquetes | Implementados e testados em isolamento; publicação/migrações pendentes |
| Mapa de calor, filtros combinados e análise de registros por período/região | Implementados; seleção poligonal ainda não restringe as consultas de histórico e o histórico completo de melhorias regionais continua pendente |
| Antes/depois, etapas configuráveis, timeline, relacionados e confirmação comunitária | Implementados e testados neste conjunto; mudanças oficiais de status notificam acompanhantes |
| Capa, apresentação, estatísticas recebidas, fixação e compartilhamento externo | Implementados e testados neste conjunto |
| Moderação persistente de denúncias/comentários e decisões auditadas | Pendente; o atalho antigo de denúncia do feed ainda não equivale a uma denúncia persistida |
| Sinais de spam/abuso para análise humana | Pendente; não foram criados bloqueios automáticos frágeis |
| Rankings administrativos, CSV filtrado/neutralizado e PDF | Pendente; o CSV antigo ainda exige correção antes de ser considerado o relatório ampliado |
| Cidade em Números e Índice de Melhoria Urbana | Pendentes; a análise regional existente não substitui esses recursos públicos |
| Comunidades por bairro e discussões locais | Pendentes |
| Diretório verificado de órgãos, associação a problemas e protocolos | Pendentes; não há contatos nem protocolos inventados |
| Notificação de acompanhantes para toda modalidade de atualização, além do status oficial | Expansão pendente; fotos adicionadas já aparecem na timeline |
| Desempenho, acessibilidade e regressão final de toda a expansão | Verificações incrementais aprovadas; medições completas antes/depois e revisão final continuam pendentes |
| MySQL real, Supabase real e deploy | Migrações e testes de escrita em produção não executados; não usar a base da aplicação como fixture |

Os itens pendentes são trabalho de implementação ou validação adicional, não funcionalidades concluídas nem impedimentos técnicos definitivos. As autorizações do usuário para continuar a expansão permanecem válidas.
