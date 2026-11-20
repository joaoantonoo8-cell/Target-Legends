# Ultimate Target: backend protegido (base de integração)

## Antes de qualquer coisa
**Blaze NÃO é garantidamente grátis.** Exige faturamento e pode cobrar pelo uso. Se seu limite é R$ 0, **não ative Blaze ainda**. Configure alertas de orçamento, sabendo que alertas não bloqueiam cobranças. GitHub Pages continua grátis.

## O que esta versão entrega
- `functions/index.js`: operações autenticadas no servidor para criar perfil inicial, consultar ranking, listar jogadores (admins), editar moedas/XP/arma, resetar jogador, conceder/remover admin (somente dono), iniciar/parar eventos e publicar avisos.
- `firestore.rules`: **nega gravações diretas** de jogadores, papéis e eventos. Apenas Cloud Functions usando Admin SDK alteram esses dados.
- `admin.js`: painel que chama funções em vez de escrever diretamente no Firestore.
- `firebase.js`: cadastro/login existentes, inicialização de perfil via função, ranking por função. **O progresso do gameplay NÃO é salvo** até migrarmos os cálculos de tiro/compras/pets/renascimentos para operações de servidor. O jogo é apenas teste nessa etapa. A pontuação existente no banco não é confiável, pois veio de clientes antigos.

## Segurança que ainda falta para lançamento
- Migrar toda a jogabilidade para comandos de servidor validados, com limites de frequência, cálculo de recompensa, compras, pets, renascimentos, missões e eventos. Sem isso, NÃO há economia online persistente nem ranking competitivo confiável.
- Revisar cadastro: o email técnico baseado em nome não garante exclusividade de forma transacional para toda a aplicação, e recuperação de senha por email real não funciona. Implementar registro de usernames no servidor, proteção contra abuso e fluxo de recuperação.
- A tela do jogo ainda calcula moedas localmente, **sem salvá-las**. Isso é intencional para evitar adulteração do banco.
- O reset muda a revisão no servidor; clientes devem ouvir mudanças no documento ou recarregar para ver o novo estado.
- O ranking é apenas uma leitura de dados existentes, **não confiável para competição até migrar gameplay e limpar pontuações antigas**.

## Implantação (somente depois de entender custos)
1. Instale Node.js 22 e Firebase CLI: `npm install -g firebase-tools`.
2. No terminal da pasta do projeto: `firebase login` e `firebase use ultimate-target-20b22444`.
3. Configure o UID **verificado** da conta Joao como variável de ambiente da função. Exemplo para testes locais: `ULTIMATE_TARGET_OWNER_UID=UID_REAL` (no Windows PowerShell: `$env:ULTIMATE_TARGET_OWNER_UID="UID_REAL"`). Para produção, use `functions/.env` com `ULTIMATE_TARGET_OWNER_UID=UID_REAL` (não publique esse arquivo). Confirme que UID é do dono em Authentication > Users. **Não use o UID que aparece em ZIP antigo sem verificar**.
4. Em `owner-uid.js`, coloque o mesmo UID para exibir o botão. Essa variável no navegador não concede privilégios.
5. Na pasta `functions`: `npm install`.
6. Na raiz: `firebase deploy --only functions,firestore:rules`.
7. **Só depois de testar**, envie os arquivos estáticos (`index.html`, `firebase.js`, `admin.js`, `firebase-config.js`, `owner-uid.js`) ao GitHub Pages. **Não envie** `functions/.env`, `node_modules` ou credenciais de serviço.

## Aviso
Publicar regras restritivas antes das funções fará a versão antiga parar de salvar. Planeje uma janela de teste e faça backup do Firestore antes de migrar dados. Esta entrega é uma **base segura de administração e eventos**, não o jogo completo com progressão persistente.
