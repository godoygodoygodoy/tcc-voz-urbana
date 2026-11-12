# Desempenho — Voz Urbana

## Resultado medido em 12/11/2026

A auditoria encontrou uma cena 3D adicional montada em uma seção permanentemente invisível, animação contínua de formas que provocava pintura, variáveis CSS herdadas atualizadas na raiz a cada movimento do mouse, observação excessiva do DOM natalino, ciclos ociosos de animação, carregamento antecipado de todas as páginas e PNGs muito maiores que a resolução exibida.

Foram preservados o hero visível com cidade e estrelas, atmosfera reativa, luzes, neve, decoração natalina, cores, menus e funcionalidades. A seção removida tinha `display:none` e duplicava a cena visível. O orçamento de efeitos adapta densidade, DPR e frequência de renderização à capacidade indicada pelo dispositivo; o modo normal continua mais detalhado.

| Cenário | Intervalo entre quadros antes → depois | LCP antes → depois | CLS antes → depois |
| --- | --- | --- | --- |
| Inicial, normal | 65,1 → 16,0 ms | 8,738 → 6,642 s | 0,00043 → 0,00004 |
| Inicial, Natal | 158,4 → 29,0 ms | 5,430 → 3,354 s | 0,00063 → 0,00010 |
| Feed, normal | 51,0 → 15,0 ms | 3,904 → 1,714 s | 0,05272 → 0,00136 |
| Feed, Natal | 120,6 → 23,3 ms | 3,882 → 1,900 s | 0,05272 → 0,00136 |

A coluna de quadros é a média dos P50 de duas execuções de cada cenário; LCP e CLS também são médias dessas duas execuções. Há uma primeira execução especialmente lenta na inicial normal: LCP de 12,240 s antes e 10,048 s depois; na segunda, 5,236 s e 3,236 s. Esses valores estão incluídos, sem descartar o primeiro resultado. Os JSONs preservam todas as amostras e os P95. O campo `summary` do coletor usa mediana superior, e por isso pode diferir desta tabela.

No feed, o JavaScript transferido caiu de 526.509 para 157.073 bytes comprimidos (−70%); os recursos totais passaram de 2.428.750 para 281.595 bytes (−88%). Na inicial, o total caiu de 2.100.737 para 532.974 bytes (−75%), com apenas um canvas. O heap JavaScript do feed normal ficou em 5,48 MB, contra 7,94 MB antes. Isso mede heap naquele instante, não toda a RAM do navegador nem um teste prolongado de vazamentos.

## Alterações principais

- Páginas e bibliotecas de mapa/3D carregadas sob demanda; mapa da inicial adiado até perto da área visível; skeletons reservam espaço.
- Relógio compartilhado para animações, sem ciclo ocioso no Lenis ou no indicador do menu; pausa em abas ocultas e cena fora da área visível; respeito a `prefers-reduced-motion`.
- Cidade com geometria/material compartilhados e edifícios instanciados; estrelas em um único conjunto de pontos; DPR e partículas adaptativos. Three.js permanece em um chunk pesado, necessário apenas à cena.
- Movimento decorativo por transformações e opacidade; atualizações do ponteiro restritas às camadas decorativas; medidas do menu armazenadas; navegação sem espera artificial de 520 ms.
- Guirlandas observam mudanças estruturais relevantes, agrupadas por quadro, e pausam fora da área visível.
- Marca em WebP: 498.016 → 19.636 bytes para o mascote; 537.317 → 38.060 para o texto. Ícones do feed em resolução adequada: cerca de 2–4 KB cada. Originais preservados. Ícone Apple dedicado de 180 px. Sem biblioteca nova em runtime.
- Cache de cinco minutos somente para categorias públicas, invalidado após criação administrativa. Deduplicação de requisições simultâneas de notificações/perfil, separada por token. Dados privados e permissões não recebem TTL.
- Polling sem sobreposição, suspenso em aba oculta e limpo ao desmontar; respostas iguais preservam referências. Cartões do feed memoizados com ações estáveis; assinatura do estado de autenticação limitada aos campos usados.
- Curtidas otimistas com proteção contra repetição e rollback por publicação. Pesquisa de pessoas mantém debounce e cancela requisições antigas.
- Histórico do chat: últimos 50 itens, paginação retroativa e consultas incrementais. Todos os itens antigos continuam acessíveis. Leituras deixam de obter bloqueios de escrita; envio mantém transação, bloqueios e limite calculado sobre todo o histórico.
- Comentários em páginas de 30, com total e botão para carregar mais; publicação e comentários são buscados em paralelo. Mapa não baixa os mesmos 100 marcadores ao trocar apenas a página da lista.
- URLs temporárias de prévias e avatares liberadas corretamente, inclusive em StrictMode. Cache HTTP/compressão configurados para arquivos públicos no Apache; HTML revalidado. Mídia protegida permanece privada e sem cache público.

## Método e limites

Chrome instalado, headless, viewport 1365×900, CPU com lentidão artificial de 4×, 1,6 Mbps de download, 750 Kbps de upload e 40 ms de latência. Cache frio por contexto, gzip no mesmo servidor estático, 12 publicações de teste, temas normal/natalino, duas execuções por combinação. Mouse, rolagem e abertura/fechamento do menu reproduzidos pelo mesmo script antes e depois.

Foram usados Chrome DevTools Protocol (`Performance.getMetrics`, CPU/rede), PerformanceObserver (LCP, layout shifts, long tasks e Event Timing), amostragem rAF e contagem de commits React. `interactionMaxMs` é a maior duração observada no teste, não INP de campo. Não foi produzido escore Lighthouse. Fontes e mapas externos foram bloqueados nos dois lados para controlar a comparação. A GPU headless pode usar software; esse cenário não representa um computador físico específico.

As APIs usam rotas reais com persistência isolada em memória; não foram consultados dados de produção. Portanto não há afirmação de melhoria de latência SQL/Supabase nem análise de consultas lentas de um servidor real. Resultados não garantem 60 FPS em todo dispositivo: o Natal ainda tem quadros acima de 16,7 ms, e P95 é maior que P50. Validar Web Vitals e uso prolongado em equipamentos reais após publicação continua necessário.

## Banco e publicação

A migração `20261112110000_feed_performance` adiciona somente índices em `problemas(data_criacao)` e `problemas(usuario_id,data_criacao)`, correspondentes à ordenação recente e às consultas de perfil. Não remove tabelas, colunas, registros ou índices existentes. Ainda não foi aplicada ao banco. Antes de aplicar, verificar `EXPLAIN` com distribuição real dos dados e o custo operacional da criação dos índices. O fluxo de migração e backup existente foi preservado; a migração anterior de seguidores continua sujeita à revisão que já exigia.

Código/build não foram publicados nem o banco de produção modificado.

## Reprodução e verificações

Na raiz, após `npm run build --prefix frontend`:

```powershell
node --experimental-vm-modules frontend/tests/performance.cjs --dist frontend/dist --out frontend/performance-artifacts/result.json --runs 2
node --test frontend/tests/performance-runtime.cjs
node --experimental-vm-modules --test backend/tests/performance.node.js
```

Com preview Vite na porta 4173:

```powershell
node frontend/tests/i18n-system.cjs
node --experimental-vm-modules frontend/tests/followers-browser.cjs
node --experimental-vm-modules frontend/tests/performance-browser.cjs
```

Build de produção aprovado. Backend: 28 testes passaram; um teste MySQL real foi pulado por falta de banco isolado configurado. Catálogo: 755 chaves nos três idiomas; cinco testes de tradução, dois natalinos e dois de execução/polling aprovados. Navegador: 94 verificações de idiomas/menu, 45 de seguidores/chat e nove de paginação, isolamento de chunks, curtida otimista/rollback e navegação por âncora, sem erros JavaScript observados.

As amostras completas estão em [before.json](performance/before.json) e [after.json](performance/after.json). O coletor é [performance.cjs](../tests/performance.cjs). Para regenerar as imagens a partir dos originais, executar `node frontend/scripts/optimize-public-images.cjs` com Chrome/Playwright disponíveis. Builds, capturas e medições de trabalho em `performance-artifacts` ficam fora do Git.

O schema Prisma com os índices adicionais também passou em prisma validate.
