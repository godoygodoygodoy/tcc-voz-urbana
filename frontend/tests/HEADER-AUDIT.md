# Auditoria do cabeçalho

## Implementação

- `Header.js` é o cabeçalho único, inclusive na `LandingPage`. O estado compacto continua sendo acionado após 72 px de rolagem.
- `SiteMenu.js` renderiza o menu em um portal no `body`. Por ser fixo e estar fora do fluxo, ele não reservava espaço no cabeçalho.
- `.site-header-inner` agora tem uma coluna real de grid para o menu: inset da viewport + botão de 44 px + intervalo mínimo de 16 px. O botão fixo usa as mesmas variáveis.
- Marca e ações ocupam colunas próprias. As imagens da marca encolhem dentro da largura disponível; em até 360 CSS px as ações passam para a segunda linha. O botão permanece visível e fixo.
- Removidos o cabeçalho duplicado da inicial, as regras específicas de espaçamento da inicial e as declarações conflitantes de posição do menu. As regras antigas para `svg` não alcançavam o pombo, que é um `img`.
- A `.feed-rail` usava `top: 1.5rem`, permitindo que sua marca entrasse na faixa do cabeçalho durante a rolagem. Agora sua posição considera a altura do cabeçalho e um intervalo adicional.

## Rotas

Acesso direto às URLs `/`, `/#como`, `/#sobre`, `/#contato`, `/contato`, `/map`, `/feed`, `/login`, `/forgot-password`, `/reset-password?token=fixture`, `/register`, `/problem/1`, `/report`, `/profile`, `/admin` e `/inexistente` (fallback atual).

`/problem/1` representa a rota parametrizada `/problem/:id`. `/contato` redireciona para a âncora da inicial. As rotas de autenticação redirecionam usuários autenticados; `/report` e `/profile` redirecionam visitantes; `/admin` exige administrador. `VerifyEmailPage.js` existe, mas sua rota está comentada em `App.js`; não é uma página acessível registrada.

## Verificação reproduzível

O script `header-layout.cjs` usa Playwright e Chrome instalado. Inicie o preview do build em `127.0.0.1:4173` e execute a partir da raiz:

```powershell
npm install --no-save --package-lock=false playwright
node frontend/tests/header-layout.cjs
```

A matriz combina visitante, usuário e administrador; cinco viewports (320×740, 390×844, 768×1024, 1440×900, 900×1440); escala normal e reflow equivalente a 200%; menu aberto/fechado; topo/rolagem. Verifica distância da marca, limites das imagens, botão alcançável por hit testing e marca lateral abaixo do cabeçalho.

Limites: os dados da API e as sessões são simulados localmente, sem login real. O reflow de 200% é simulado reduzindo pela metade as dimensões CSS da viewport; não é zoom acionado pela interface do navegador. A altura mínima do documento é aumentada no teste para exercitar a rolagem mesmo em páginas curtas. O resultado agregado fica em `header-layout-results.json`.

Resultado final: build de produ??o aprovado; 1.920 verifica??es automatizadas, sem falhas na matriz descrita. Confer?ncia visual adicional do cabe?alho em 320?740 e verifica??o isolada do estado compacto e da marca lateral.
