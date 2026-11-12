# Seguidores, privacidade e chat

A implementação reutiliza `amizades` como relações direcionais. O modelo Prisma chama-se `Seguimento`, mas as colunas, chaves e IDs existentes são preservados por `@map`. Amizade é calculada a partir de dois acompanhamentos aceitos; não existe uma segunda tabela de amizades ou um segundo botão para adicioná-las.

## Migração dos dados existentes

A migração `20261112090000_followers_privacy` adiciona `usuarios.perfil_privado` com padrão público e dois índices. Cada amizade antiga aceita ganha a direção inversa aceita, preservando a linha inversa e seu ID quando ela já existir. Solicitações antigas pendentes tornam-se acompanhamentos de uma direção, pois todos os perfis existentes começam públicos. Recusas permanecem registradas. Nenhuma conversa, mensagem, publicação ou usuário é removido.

O arquivo contém atualizações de dados e uma tabela temporária de apoio. Por isso, o `safe-migrate.js` existente exige revisão manual de DBA e interrompe o deploy automático. Esse bloqueio não foi alterado. Antes da aplicação, revisar o SQL, criar e restaurar um backup em ambiente de teste e usar o processo de migração aprovado da instalação, durante uma janela sem gravações do aplicativo. Não usar reset, recriação, limpeza de tabelas ou seed para realizar essa migração. A implementação e os testes não aplicam a migração ao banco da aplicação.

Depois da migração, gerar o Prisma Client e iniciar o backend. A inicialização verifica a nova coluna antes de aceitar requisições. Quando Supabase é usado, os buckets já existentes `posts` e `reports` passam a ser privados, sem mover ou apagar seus arquivos; avatares mantêm a configuração pública existente. O frontend recebe URLs do endpoint de mídia com tickets restritos a uma imagem. Cada leitura consulta novamente a permissão atual no banco, inclusive depois de deixar de seguir alguém. URLs locais antigas de publicações também passam pela verificação de privacidade. O backend usa a mesma chave JWT configurada para emitir os tickets.

## Regras persistentes

Seguir e deixar de seguir são operações idempotentes, protegidas pela chave única da relação. Perfis privados exigem aprovação do destinatário. Tornar um perfil público aceita as solicitações pendentes; torná-lo privado preserva os seguidores existentes. Publicações, comentários, salvos, curtidas privadas e imagens respeitam a visibilidade no backend. Nome, foto, biografia e contagens continuam disponíveis como informações básicas do perfil.

Qualquer usuário autenticado pode iniciar uma conversa, inclusive com um perfil privado. A dupla ordenada de participantes reutiliza a mesma conversa. O histórico só exige participação, independentemente de acompanhamento ou cota. Em cada envio, uma transação `ReadCommitted` bloqueia os usuários em ordem e a linha da conversa com `FOR UPDATE`, consulta o acompanhamento mútuo e conta todas as mensagens históricas daquele remetente. Sem acompanhamento mútuo, o envio só é aceito enquanto esse total for menor que três. Mensagens enviadas enquanto o chat estava livre também contam se a amizade terminar. O cliente não fornece nem altera contadores.

Perfis, listas e solicitações recebem atualizações periódicas e ao voltar à aba; alterações locais avisam as outras telas e abas. O histórico e a permissão de envio são atualizados separadamente. Uma falha de atualização não apaga o histórico já apresentado.

## Verificação

- `npm run test:followers` no backend: regras, concorrência, rotas HTTP reais, privacidade, mídia e tentativas de manipular remetente ou cota, com persistência isolada em memória.
- `npm run test:followers:db` no backend: teste opcional dos bloqueios no MySQL real. Exige `NODE_ENV=test`, `TEST_DATABASE_URL` de um banco de testes já migrado e `TEST_DATABASE_ALLOW_CLEANUP=true`; o guard existente impede o uso do banco da aplicação. A limpeza remove somente os UUIDs criados pelo teste.
- `npm run test:followers:browser` no frontend, com Vite local na porta 4173: três contas, solicitações, listas, privacidade, acompanhamento mútuo, mensagens, recarga, limites e celular. Usa as rotas reais com banco em memória e não conecta ao banco da aplicação.
- `npm run test:i18n` no frontend: cobertura dos novos textos em português, inglês e espanhol.

O teste MySQL é ignorado quando nenhum banco de testes é configurado. Isso não equivale a validar a aplicação da migração em uma instalação real.
