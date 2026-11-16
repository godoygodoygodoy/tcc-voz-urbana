# Stories e bibliotecas de mídia — 16/11/2026

**Atualização posterior:** a migration de composição foi ensaiada com restauração verificada e aplicada em produção em 16/11/2026 às 17:03, America/Sao_Paulo. O banco real passou no diff e na verificação de integridade. Os trechos abaixo descrevem o estado histórico da primeira entrega; consulte [o relatório da correção de produção](CORRECAO-SCHEMA-STORIES-2026-11-16.md) para o estado atual da migration e da inicialização.

## Estado da entrega

Esta implementação amplia o sistema existente. **O ecossistema completo solicitado ainda não está concluído nem publicado em produção.** Não houve escrita no MySQL de produção, publicação de conteúdo de teste ou alteração de credenciais.

### Implementado no código

- Acesso separado para ver o próprio perfil e editar a conta; anel de Stories na foto do perfil e faixa horizontal compacta no feed.
- Composição 9:16; exportação de bases estáticas WebP em 1080×1920. Ajuste proporcional, zoom, colagem em grade e tira de fotos. Imagens animadas e vídeos são preservados como mídia animada; não se pode combinar vários arquivos animados numa colagem estática.
- Elementos independentes de texto, emoji, localização digitada, menção, link HTTPS, hashtag visual, referência musical, GIF, pergunta, enquete, slider e contagem regressiva.
- Movimento por toque/mouse e teclado, tamanho, rotação, alinhamento, cor, fundo, transparência, duplicação, ordenação de camadas, exclusão, desfazer/refazer de elementos e traços. O histórico é limitado a 20 snapshots; não inclui todas as configurações globais do fundo/layout.
- Desenho com caneta/marcador/borracha, cor, espessura e opacidade; a borracha apaga tinta, sem apagar a foto. Desenhos integram a base estática publicada.
- Filtros com intensidade, inclusive monocromático, quente, vívido, vintage, brilho, frio, espelho e desfoque. São parâmetros da composição renderizada, também sobre vídeo, sem modificar o arquivo original.
- Câmera com permissão explícita, foto, troca frontal/traseira, microfone opcional, gravação hands-free até 59 segundos, temporizador e torch apenas quando suportado. Boomerang usa captura real limitada a 24 quadros de 360×640 e vídeo nativo do navegador. A disponibilidade depende de MediaRecorder/captureStream; não usa áudio.
- Respostas de pergunta, voto de enquete, slider e interesse em contagem regressiva persistidos no MySQL. A primeira resposta por elemento e usuário permanece; o proprietário consulta respostas paginadas, espectadores consultam somente a própria resposta. Interesse na contagem **não agenda lembrete**.
- Menção validada contra usuários reais acessíveis. Gera notificação com ator real apenas quando o destinatário pode visualizar o Story, respeitando preferências.
- Reprodução, pausa, progresso, navegação por teclado e gesto horizontal, curtida, visualizações únicas, lista de espectadores do autor, exclusão e expiração já integradas às permissões existentes.
- Resposta privada pelo sistema de conversas existente, com o limite de mensagens aplicado pelo backend. A resposta atual é texto de conversa; não inclui cartão persistente de referência ao Story.
- Publicação com documento versionado validado no backend, limites de elementos/tamanho, validação de URLs, upload autenticado, controle de processamento e chave idempotente ligada ao hash do conteúdo. Repetir o mesmo envio retorna o Story anterior; mudar o conteúdo usando a mesma chave retorna conflito.

### GIPHY

O usuário autorizou expressamente uma chave **Web pública dedicada**. A pesquisa ocorre diretamente do navegador, com debounce, tendências, GIFs/stickers, páginas de 12, preview, tratamento de indisponibilidade/429 e marca oficial Powered By GIPHY. O documento persiste **somente o ID**; a mídia animada é consultada novamente ao exibir o elemento. Não há proxy, cache de respostas, cópia para Supabase ou achatamento do GIF.

Configurar no build do frontend: `VITE_GIPHY_API_KEY`. Não colocar uma chave privada Apple nessa variável. A mudança exige novo build do frontend.

A chave beta e o uso em produção seguem os limites/aprovação do provedor. Não foi validada uma chave real nesta sessão. O arquivo de marca `frontend/src/assets/providers/powered-by-giphy.png` veio do pacote oficial de atribuição, sem redesenho.

Referências consultadas: [API e práticas de integração](https://developers.giphy.com/docs/api/), [marcas oficiais](https://media.giphy.com/giphy-attribution-marks.zip). A proibição de proxy/cache prevalece sobre a otimização genérica solicitada para outros provedores.

### Apple Music / MusicKit JS

Backend separado de provedores: pesquisa de músicas/artistas/álbuns, páginas de 12, timeout, limite de requisições e respostas normalizadas. Assinatura ES256 com a chave privada exclusivamente no backend. A seleção persistida é resolvida novamente pelo backend por ID de catálogo, evitando confiar em capas/nomes/URLs enviados pelo cliente.

Frontend: biblioteca, inserção de referência da música, nome/artista/capa, link Apple Music, carregamento tardio do MusicKit JS oficial, autorização explícita e reprodução pelo SDK. **Nenhum áudio Apple é baixado, gravado ou incorporado ao arquivo do Story.** Disponibilidade e reprodução dependem da conta, credenciais, catálogo e permissões oficiais; não há seleção de trecho para sincronização.

Variáveis backend:

```dotenv
APPLE_MUSIC_TEAM_ID=
APPLE_MUSIC_KEY_ID=
APPLE_MUSIC_PRIVATE_KEY=
APPLE_MUSIC_STOREFRONT=br
```

A chave PEM aceita `\n` escapados. `FRONTEND_URL`/`CORS_ORIGIN` devem conter as origens autorizadas; o token entregue ao MusicKit é curto e vinculado à origem. O token de desenvolvedor é uma credencial de cliente prevista pelo MusicKit; a chave privada nunca é entregue. Configurar no Render, sem versionar o `.env`.

Referências: [MusicKit](https://developer.apple.com/musickit/), [tokens ES256](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens). As credenciais Apple não estavam preenchidas no ambiente auditado. A autenticação/reprodução real não foi testada.

## Banco e publicação

Migração criada: `backend/prisma/migrations/20261116170000_story_composition/migration.sql`.

- `stories`: JSON opcional de composição, referência opcional à mídia original individual e chave/hash de publicação; índice único por autor/chave. Stories antigos continuam sem composição e preservam a mídia existente.
- `stories_respostas`: FKs para Story e usuário, JSON de resposta, data, índice de usuário e unicidade Story/elemento/usuário.
- Sem DROP, truncamento, conversão global de collation ou migração de dados para Supabase. As novas tabelas mantêm a collation Unicode adotada pelas migrações existentes.

**Migração não aplicada.** Prisma validate e generate executados em 7.10.0; SQL não foi ensaiado num MySQL isolado nesta etapa. Antes de produção: backup recente verificado, ensaio/restauração e revisão vinculada ao banco/SQL, então o fluxo existente de deploy controlado. Não usar reset/db push nem desativar SCHEMA_NOT_READY. Subir este schema sem aplicar a migração revisada impedirá corretamente a inicialização.

A base estática e a mídia original individual são arquivos separados no Storage; elementos permanecem no MySQL e são renderizados pelo visualizador. O resultado não é um MP4 único achatado. Em colagens, a composição final é enviada; o armazenamento de **todos** os originais individuais da colagem ainda não foi implementado. Desenhos são rasterizados na base; os traços não são persistidos para reedição posterior.

## Módulos principais

- `frontend/src/components/StoryComposer.js`: coordenação da criação, captura e publicação.
- `frontend/src/components/stories/StoryCanvas.js`, `StoryElements.js`, `storyDocument.js`, `useStoryHistory.js`, `MediaProcessor.js`: base, elementos, coordenadas, histórico e processamento.
- `MediaLibrary.js`, `GifLibrary.js`, `giphyProvider.js`, `musicProvider.js`: bibliotecas e serviços separados.
- `StoriesRail.js`, `StoryProgress.js`, páginas de perfil, menus, estilos e catálogo pt-BR/en/es: integração na interface existente.
- `backend/src/services/storyComposition.js`, `mediaProviders.js`, `stories.js`, rotas `stories.js`/`mediaLibrary.js`, registro em `server.js`: validação, provedores, persistência e acesso.
- Schema/migração, `.env.example` frontend/backend, scripts de testes e fixtures isoladas.

## Validação realizada

- Regressão backend de expansão: **36 testes aprovados**.
- Novos testes de composição/provedor: **5 aprovados** — URLs perigosas, limites, IDs GIPHY, retry idempotente/conflito, voto concorrente/imutável, perguntas/sliders/contagem, menções e preferências, privacidade, expiração, tokens Apple ES256/origem, normalização e 429.
- Teste de espectadores: **1 aprovado** — proprietário, identidade atual, expiração e feed de seguidos.
- Contrato frontend GIPHY: **2 aprovados**, com transporte isolado, sem credenciais reais: consulta direta, paginação limitada, no-store, falhas e falta de configuração.
- Navegador Chrome: Stories **8 verificações**; composer **8 verificações**; ecossistema **6 grupos de verificações** (duplicar/desfazer/refazer, enquete, provedor não configurado, persistência, voto, 9:16 e ausência de overflow em 390×844 e 1440×1000). Sem erros JavaScript nos fluxos executados.
- Auditoria i18n: 1.174 chaves em três idiomas e cinco testes aprovados; dois testes de regressão do tema natalino aprovados; build de produção; validação e geração do cliente Prisma 7.10.0.
- Artefatos locais ignorados pelo Git: `frontend/performance-artifacts/story-ecosystem*.png` e `story-ecosystem.json`.

Medição inicial do teste isolado: editor pronto em **632 ms** numa execução, incluindo o carregamento tardio do chunk. Isso não mede aparelho físico, produção, câmera ou Core Web Vitals e não demonstra ganho comparativo. Reduziu-se trabalho verificável no código: vídeo usa reprodução nativa, arrastar elementos não redesenha a base, imagens são decodificadas sequencialmente, recursos são liberados e tarefas ocultas são pausadas. **Não há comparação válida antes/depois de FPS, CPU, RAM, LCP ou INP nesta etapa.**

## Pendências explícitas

- Configurar e validar APIs reais e sua aprovação/limites; validar reprodução/autorização MusicKit com conta real. Nenhuma faixa foi apresentada como áudio incorporado.
- Ensaiar/aplicar migração com backup e fluxo de revisão existente; publicar backend e frontend e validar dados reais/Storage/Render. Não foi feito deploy nesta etapa.
- Testar câmeras e microfones físicos, frontal/traseira, torch, Boomerang, gravação, interrupções e navegadores móveis reais. Os controles dependem das capacidades do dispositivo; build não equivale a esse teste.
- Add Yours/correntes, foto e avatar como camadas de mídia independentes, cutouts, catálogo de frames e figurinhas personalizadas ainda não implementados. Não há botões decorativos prometendo esses recursos.
- A localização atual é digitada e explicitamente compartilhada; pesquisa geográfica com seleção de lugares ainda não implementada. Hashtag é visual, pois não existe rota correspondente verificada.
- Sem catálogo de áudio próprio/licenciado para sincronização ou exportação final com trilha; sem efeitos avançados de glitch, RGB split, distorção, partículas/transições na composição. Tema natalino global preservado.
- Zoom atual é centralizado; não há crop livre/pan da mídia, redimensionamento por pinça ou seleção visual sofisticada de camadas. Persistência de desenho vetorial e reabertura de rascunhos publicados não implementadas.
- `AMIGOS` continua sendo o público de acompanhamento mútuo existente; **não** foi renomeado falsamente para uma lista gerenciada de Amigos Próximos.
- Respostas de enquete/pergunta são paginadas; agregação estatística completa/gráficos, notificações de resposta de figurinha e lembretes de contagem não implementados.
- O warning de chunk grande do cenário 3D já existente permanece. Não se declarou otimização global ou 60 FPS com base em testes vazios/isolados.
