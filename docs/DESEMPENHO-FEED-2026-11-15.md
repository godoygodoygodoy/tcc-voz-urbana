# Auditoria e otimização do feed — 15/11/2026

## Cobertura e limites

O banco real estava com **zero publicações e zero imagens de publicações**, confirmado pelo usuário. Não foram criados dados nem executadas migrações em produção. As medições usam o estado vazio real; os cenários com vários itens usam somente os testes funcionais isolados já adotados pelo projeto, não servem como evidência de ganho de desempenho com conteúdo real.

Chrome 157 headless, CPU limitada em 4×, rede de 1,6 Mbps/750 Kbps e 40 ms de latência, larguras 1365 e 390 px, temas normal e natalino. Duas execuções por combinação antes/depois. Servidor estático local com gzip, handlers reais do backend e MySQL remoto real; gravações bloqueadas e fontes externas bloqueadas igualmente. Não é medição de campo nem um celular físico. O TTFB do documento local não representa o Render. Event Timing do teste não equivale ao INP de campo; intervalos de rAF não comprovam FPS da GPU.

## Gargalos encontrados

- Consulta do feed carregava todo o histórico de atualizações, relações e aliases duplicados que os cards não usam.
- A lista completa de salvos era buscada na entrada e nas trocas de abas; as verificações de salvamento percorriam essa lista para cada card.
- Alterações sociais recarregavam a página de publicações em vez de revalidar somente os itens carregados.
- Paginação por offset inclusive para ordem cronológica; o carregamento dependia de avançar páginas de nove itens.
- Imagens de publicações eram sempre originais e `no-store`, mesmo para exibições pequenas e repetidas.
- JavaScript de stories para visitantes anônimos e de recorte de imagem era carregado sem necessidade.
- Trace do Chrome identificou animação de contornos do menu fechado e transição de `box-shadow` do cabeçalho não composta. O custo de estilo continua relevante, sobretudo no tema natalino; não há evidência de que todos os efeitos sejam gargalos nem de 60 FPS em hardware modesto.

## Alterações

### Feed e consultas

`GET /api/problems?view=feed` reutiliza a rota existente, com projeção própria e lotes de **12 itens**, máximo de 15. Retorna contagem de apoios e os estados de apoio/salvamento do visitante na própria consulta, sem buscar comentários ou histórico de atualizações. A API anterior continua disponível para mapas e demais integrações.

Ordem recente usa cursor por data e id, com desempate estável e contexto validado para filtros/visitante. Após o primeiro lote, o cliente dispensa o COUNT. Ordem por apoios preserva a relevância com paginação por offset e desempate estável, pois a classificação muda com as interações. Duplicatas são eliminadas na composição da lista.

IntersectionObserver carrega os próximos lotes; o botão existente de carregar mais continua disponível para teclado e navegadores sem observer. Há cancelamento de consultas anteriores, proteção contra carregamentos concorrentes, preservação dos itens em falhas e tentativa novamente. Conversas e notificações não disparam a busca inicial de publicações. A lista é preservada ao trocar abas. Seguir alguém invalida a entrada do feed para atualização na próxima abertura; a retirada de acesso é revalidada em lotes de IDs, sem baixar novamente todos os cards.

Salvos completos são carregados apenas na aba própria. Sets permitem consultar o estado de cada card em tempo constante. Salvar e remover são otimistas, com rollback, bloqueio de duplicidade e proteção contra respostas de outra sessão/usuário. Curtidas mantêm rollback e agora possuem estado de envio independente por publicação.

Não foi implantada virtualização que remova/recrie cards: não há volume real para justificar o risco de alterar posição, foco e altura variável. A paginação limita cada resposta; permanece necessário medir uma lista longa real quando houver conteúdo.

### Mídia e cache

Adicionado **Sharp 0.35.5** para derivados WebP de 480/960/1440 px, servidos pela rota de mídia existente. Não usa transformação paga do Supabase, não sobrescreve originais e mantém o original no lightbox. GIF/WebP animados não são achatados; arquivos legados não conversíveis continuam disponíveis no formato original.

Processamento limitado a duas tarefas, fila limitada, limite de pixels de entrada e cache LRU de até 16 MiB/128 entradas, além do cache nativo limitado. Requisições simultâneas para o mesmo derivado compartilham o trabalho. Não há armazenamento de derivados em bucket público ou migração dos arquivos antigos.

O servidor verifica autorização **antes** do cache e de responder 304. ETag estável identifica objetos imutáveis (uploads usam UUID e `upsert:false`), e `private, no-cache` exige revalidação. Revogar acesso continua retornando 404, mesmo com ETag válido. O cache não inclui permissão ou resposta privada de API.

Cards usam picture/srcset, dimensões, lazy loading e decodificação assíncrona. Vídeos de story continuam sem autoplay e pausam fora da área visível ou com a aba oculta; listeners/observer são limpos.

### JavaScript e efeitos

Recorte de imagem carregado sob demanda; stories não são baixados para visitantes anônimos. Datas relativas do feed e notificações reutilizam Intl nativo e formatadores por idioma. Contornos do menu pausam quando fechado. Sombra/fundo do cabeçalho são preservados com camadas e transição de opacidade, em vez de interpolar box-shadow. Os efeitos normais e natalinos foram mantidos, assim como os controles de movimento reduzido e pausa da aba já existentes.

## Medições

Medianas de duas amostras; diferenças pequenas podem ser variação. Estas tabelas descrevem o **feed vazio**, não o tempo até uma publicação aparecer.

| Cenário | Feed pronto antes → depois | LCP antes → depois | Trabalho da thread principal durante rolagem antes → depois |
| --- | --- | --- | --- |
| Desktop normal | 2113 → 1930 ms | 2144 → 1996 ms | 1895 → 1712 ms |
| Desktop natalino | 2341 → 2155 ms | 2232 → 2142 ms | 2724 → 2511 ms |
| Celular normal | 2236 → 1880 ms | 1894 → 1742 ms | 1535 → 1155 ms |
| Celular natalino | 2182 → 2194 ms | 1978 → 1940 ms | 2281 → 2327 ms |

- Recursos requisitados: **28 → 23**, cerca de 18% a menos.
- JavaScript transferido no cenário medido: **187009 → 177061 bytes**, cerca de 5,3% a menos.
- Commits React: normal desktop **14 → 12**; natalino desktop **15 → 13,5**.
- CLS: desktop **0,0176 → 0,0151**; celular permaneceu em **0,0313**.
- Heap JS: aproximadamente 5,3 MiB antes; depois, aproximadamente 5,2–5,6 MiB. **Não houve redução consistente de memória**, e isso não inclui memória nativa/GPU.
- Event Timing máximo mediano: desktop normal 56 → 48 ms; natalino 76 → 88 ms; celular normal 36 → 32 ms; natalino 48 → 52 ms. Não declarar ganho uniforme de interação ou INP com essas amostras.
- O cenário natalino móvel não apresentou ganho consistente em rolagem/tempo total. Continua sendo uma área para perfilamento em dispositivos físicos.
- Sem imagens de publicações reais, não foi medida redução de bytes dessas imagens nem de tempo até uma publicação aparecer.

Resultados JSON e trace completos ficam em `frontend/performance-artifacts/` (ignorado pelo Git). Executor reproduzível: `npm run measure:feed:real -- --runs 2 --out performance-artifacts/feed-real.json`; precisa de acesso de leitura ao banco. O executor não cria contas, não fabrica autenticação e bloqueia mutações. O relatório registra as medições de comparação; ajustes finais de proteção de sessão/cancelamento foram verificados funcionalmente e não representam uma nova rodada estatística.

## Render e MySQL

Três chamadas pontuais de health: **31415 ms**, **254 ms**, **232 ms**, HTTP 200. O formato/revisão indicava serviço publicado ativo. A primeira latência é compatível com inicialização a frio; sem logs privados do Render não é possível atribuí-la definitivamente à suspensão, conexão ou rede. Não foi criado keepalive, contratado serviço ou alterado plano.

EXPLAIN de consulta cronológica equivalente indicou `problemas_data_idx`, acesso indexado à lista e PRIMARY no usuário; a condição de próximo lote utilizou range no índice de data. A tabela estava vazia, portanto esses planos **não validam desempenho sob carga**. Não foram criados índices ou alterado pool por suposição. O pool existente continua limitado a cinco conexões. É necessário medir consultas reais quando houver publicações e observar logs de cold start/timeout no Render.

## Testes e pendências

Testes específicos cobrem paginação estável durante inserção, filtros/cursor inválido, ausência de COUNT nos próximos lotes, visibilidade privada, projeção da resposta, redimensionamento WebP, preservação do original, coalescência/LRU, ETag e revogação de acesso antes do 304.

Teste funcional de navegador: **40 itens isolados, quatro requisições de feed, 17 verificações**, incluindo rolagem incremental, teclado, salvamento/rollback, compartilhamento, ausência de comentários antecipados, ausência de fetch de salvos/conteúdo em conversas e três larguras. Esses itens existem somente na fixture em memória e não foram usados para calcular ganhos reais.

Build final e regressões concluídos com sucesso: `test:feed-performance`, `test:expansion`, `test:followers`, `test:production` no backend; `test:feed-pagination:browser`, `test:performance:browser`, `test:discussion:browser`, `test:stories:browser`, `test:activity:browser`, `test:christmas`, `test:performance` e `test:i18n` no frontend. Os testes de navegador registraram zero erros JavaScript. Auditoria i18n: 1058 chaves nos três idiomas. `git diff --check` passou; os avisos de LF/CRLF e de tamanho do bundle não impediram build ou testes.

**Publicação:** não foi feito deploy. Nenhuma migração de desempenho foi criada/aplicada. Após autorização explícita posterior, a migração `20261116020000_notification_actor`, referente ao pedido de notificações, foi aplicada em produção com backup novo e restauração verificada; essa pendência foi resolvida. `SCHEMA_NOT_READY` permanece ativo; não foi contornado. Detalhes em `NOTIFICACOES-AUTORES.md`.

**Limites restantes:** medir feed preenchido e mídias reais, INP de campo e FPS/memória nativa em aparelhos modestos; validar sob volume a ordenação por apoios e decidir sobre virtualização; conferir logs privados do Render. A aba própria de salvos ainda usa o contrato completo existente; foi retirada do caminho inicial do feed, sem reconstruir sua integração com coleções.

## Arquivos desta otimização

Backend: `package.json`, lockfile, `routes/problems.js`, `routes/media.js`, `services/feedListing.js`, `services/mediaVariants.js`, `services/publicationMedia.js`, testes específicos e helpers isolados. Frontend: `FeedPage.js`, `StoriesRail.js`, `NotificationItem.js` (reuso do formatador), `utils/relativeTime.js`, `services/api.js`, `index.css`, `package.json`, executor de medição e teste de paginação. As demais alterações de notificações no working tree pertencem ao pedido anterior e foram preservadas.

Referência da implementação de derivados: [API oficial de resize do Sharp](https://sharp.pixelplumbing.com/api-resize/). Nenhum serviço pago foi introduzido.
