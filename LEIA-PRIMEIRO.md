# Ultimate Target: Slime Patch + Ranking (Spark)

## O que mudou
- Alvo comum virou um slime animado, desenhado em CSS (sem imagem externa).
- Ranking redesenhado com pódio e destaque da conta atual.
- Ranking lê até 100 jogadores e ordena no navegador, sem precisar de índice do Firestore. Portanto, NÃO é um ranking mundial completo acima de 100 contas.
- A pontuação continua calculada no navegador e NÃO é à prova de trapaças.

## Como testar
1. Faça backup da versão anterior.
2. Publique os arquivos do ZIP no repositório GitHub Pages (index.html na raiz).
3. No Firebase > Firestore Database > Regras, as regras atualmente publicadas precisam permitir leitura de /players para usuários autenticados. A regra antiga que permite apenas ler o próprio jogador bloqueia o ranking.
4. Há um exemplo de regras no arquivo firestore.rules. Antes de publicar, substitua COLE_AQUI_O_UID_DO_JOAO pelo UID da sua conta, conferindo cuidadosamente se está correto.
5. Não publique regras com allow read, write: if true.
6. Abra o jogo, entre com sua conta e veja o ranking. Se der erro, abra F12 > Console e compartilhe a mensagem.

## Limitações
- Esta é uma versão de teste no Spark. O Firebase não garante que jogadores não adulterem sua própria pontuação.
- O limite de 100 jogadores é uma amostra, não uma classificação global completa.
- Eventos/admin dependem das regras correspondentes estarem publicadas.
