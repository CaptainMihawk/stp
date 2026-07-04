# AGENTS.md

## Objetivo
Este repositório usa agentes de código apenas como assistentes de implementação. Qualidade é definida por especificação, testes independentes da implementação, análise estática e revisão de impacto.

## Fluxo de Versionamento e Branches (Git)
- Nunca realizar alterações, commits ou merges diretamente na branch `main`.
- Toda mudança deve acontecer em uma branch dedicada, como `feature/nome-da-feature` ou `fix/nome-do-bug` e sempre com o commit correspondente
- Caso o user ask por ajuste ou algo do tipo, escolha entre manter o historico de commits ou voltar e refazer os arquivos modificados
- O merge da branch de fix/feature para a `main` local é responsabilidade do agente apos confirmation do user 
- Ao analisar uma issue, verificar primeiro se ela pode ter sido causada por commit ou merge anterior antes de tratar como bug novo.

## Regras de operação
- Nunca tratar teste verde como prova suficiente de correção.
- Nunca assumir comportamento implícito; procurar especificação antes de alterar lógica.
- Nunca alterar regra de negócio sem perguntar ao usuario
- Nunca remover teste que falha sem justificar a causa raiz e registrar a decisão.
- Nunca usar mocks em excesso para forçar verde em comportamento que deveria ser validado por integração ou contrato.
- Em caso de ambiguidade, parar e pedir esclarecimento.

## Fluxo obrigatório antes de codar
1. Verificar se estamos em uma branch de trabalho, nunca na `main`.
2. Ler o conteudo de /rules relevante.
3. Confirmar se a issue já não foi introduzida por commit ou merge anterior.
4. Resumir a mudança em 3 partes:
   - comportamento atual
   - comportamento desejado
   - risco de regressão
5. Listar invariantes que não podem quebrar.
6. Listar áreas afetadas: backend, frontend, API, persistência, autenticação, validações, observabilidade.
7. Definir estratégia de testes antes da implementação.
8. Só então implementar.

## Invariantes obrigatórios
Antes de qualquer mudança, declarar explicitamente invariantes do domínio. Exemplos:
- operação idempotente continua id