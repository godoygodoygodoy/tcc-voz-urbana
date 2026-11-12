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
