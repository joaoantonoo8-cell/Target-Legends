# Ultimate Target Arcade + Firebase

## Jogar e publicar gratuitamente
1. Crie um projeto no https://console.firebase.google.com/ no plano Spark.
2. Em **Authentication > Sign-in method**, ative **Email/Password**.
3. Em **Firestore Database**, crie o banco e escolha a região. Abra **Rules**, cole `firestore.rules` e publique as regras.
4. Em **Project settings > Your apps**, cadastre um app **Web** e copie o objeto `firebaseConfig` para `firebase-config.js`.
5. Em **Authentication > Settings > Authorized domains**, adicione o domínio do seu GitHub Pages (`seuusuario.github.io`).
6. Crie um repositório GitHub, envie `index.html`, `firebase.js`, `firebase-config.js` e `README.md` para a raiz. Em **Settings > Pages**, publique a branch `main` e pasta `/ (root)`.
7. Abra o endereço HTTPS publicado. Em **Opções**, crie conta ou entre. O progresso é salvo na nuvem. No **Ranking**, veja os jogadores conectados.

**Atenção:** o ranking lê dados escritos pelo próprio cliente e NÃO é antitrapaça. Para um ranking competitivo confiável, cálculos de recompensas e renascimentos devem ser validados em servidor. As regras protegem as contas entre si, mas não impedem jogadores de adulterar os próprios números.

**Custo:** Firebase Spark tem cotas gratuitas de Auth/Firestore; se o uso ultrapassar as cotas, operações podem ser limitadas. GitHub Pages hospeda arquivos estáticos gratuitamente conforme limites e regras do serviço. Não é necessário cadastrar cartão para o plano Spark. Confira as cotas atuais no console Firebase.

**Teste local:** use um servidor HTTP (por exemplo `python -m http.server 8000`) em vez de abrir `index.html` diretamente por `file://`, pois os módulos JavaScript precisam de HTTP/HTTPS.

**Importante:** ao entrar em uma conta que já tem progresso, o progresso salvo na nuvem substitui o progresso local. Use uma conta de teste primeiro.
