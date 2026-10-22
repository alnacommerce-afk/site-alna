# Análise de ponta a ponta: continuidade entre computadores, orquestração e papel do RAG/LLM

**Autor:** Arquiteto (19/10/2026). **Status:** análise e proposta. Nada foi aplicado. Cada passo só roda com o "ok, aplique" do dono, pelo gerente.

## 1. A dor, em uma frase
Trabalho feito no Computador TRABALHO não chega inteiro ao Computador HOME, e o contrário também. O dono precisa retomar exatamente do ponto em que parou, em qualquer computador, sem perder nada e sem quebrar o que já está no ar para o cliente.

## 2. Fatos (com fonte)
- F1. O trabalho é compartilhado só pelo GitHub (`origin/main`). Conversas, memória e arquivos locais não são compartilhados (fonte: `docs/DECISOES.md`, 14/10: "as conversas não se enxergam").
- F2. O último registro em `docs/SESSOES.md` é de 14/10. Entre 15 e 17/10 há commits de funcionalidade, Caixa, variações e Backoffice sem entrada nesse arquivo (fonte: `git log` e `grep "^## "`).
- F3. A presença do TRABALHO é de 16/10 19:46; a do HOME é de 19/10 19:31. Os arquivos mostram só que o computador esteve ativo, não o que ficou pendente (fonte: `.claude/presenca` no Drive).
- F4. Há commits de 16/10 feitos com ajuda do Lovable: "usa o arquivo gerado pelo Lovable" (`b23659a`). Ou seja, mais de um escritor mexe no mesmo repositório (fonte: `git log`; `.lovable/plan/` e `AGENTS.md` existem).
- F5. Publicar no ar é ação manual do dono no Lovable. O repositório pode ter código que ainda não está no ar, e o contrário também (fontes: `docs/PENDENCIAS.md`; commit `66bc668`, "publicar pelo Lovable").
- F6. `docs/PENDENCIAS.md` está datado de 14/10 e ainda marca como aberto o que já foi decidido (fonte: `docs/PENDENCIAS.md` e a decisão de 16/10 sobre o INPI).
- F7. Skills novas só carregam numa conversa nova (fonte: `docs/SESSOES.md`, 14/10).
- F8. Os gatilhos em `.claude/hooks/gatilhos.ps1` só lembram o Claude de algo. Não obrigam nada nem gravam estado (fonte: o próprio arquivo).
- F9. O Supabase é o único lugar que os dois computadores acessam ao mesmo tempo, sem depender de `git pull` (fonte: a configuração do projeto e o uso de `execute_sql` em duas sessões).

## 3. Diagnóstico: onde a continuidade quebra
1. **Registro não é automático.** O Escrivão/Memória só registra quando alguém pede. Resultado: F2.
2. **Estado vivo fica só na conversa.** O que está "em andamento" não está em lugar nenhum que o outro computador leia. Resultado: F1 e F3.
3. **Dois escritores no mesmo repositório (humano, Claude e Lovable)** sem regra de quem commita o quê. Resultado: F4.
4. **Publicação é um passo fora do sistema.** Não há registro de "commit X foi publicado". Resultado: F5.
5. **Documentos-resumo ficam para trás.** `PENDENCIAS.md` e o quadro dependem de alguém lembrar de atualizar. Resultado: F6.

## 4. Como RAG e LLM ajudam (e onde não ajudam)
**Ajudam:**
- Responder "onde paramos?" e "o que falta?" buscando nos registros, em vez de depender de quem lembra.
- Achar contradições entre documentos (o trabalho que o Escrivão faz hoje à mão).
- Dar a cada sub-skill (cérebro de setor) a memória do próprio setor, com fonte.

**Não resolvem sozinhos:**
- O problema de sincronização. Se o índice for construído a partir do que está só no computador, os dois computadores vão responder diferente. **O índice precisa ser construído só a partir do que está commitado no GitHub.** Senão o RAG reproduz o problema.
- Falta de registro. Um índice não inventa o que nunca foi escrito.

## 5. Proposta de orquestração (quatro peças)
**P-A. Estado vivo no Supabase (fonte de verdade do "onde paramos").**
Tabela `agent_task` (id, setor, título, status: pedido | planejado | aprovado | executando | conferido | publicado | encerrado, dono, commit, atualizado_em, computador) e `agent_handoff` (último estado por computador e pendências). Os dois computadores leem a mesma tabela, sem depender do que está no disco. Hipótese: isso resolve F1, F3 e F9.

**P-B. Registro obrigatório ao fim de cada bloco.**
O gatilho de commit já existe (`gatilhos.ps1`). Proposta: ao encerrar um bloco, o gerente escreve a entrada em `docs/SESSOES.md` e atualiza a `agent_task`, antes do commit. Quem não registrou, não fecha. Hipótese a verificar: se o Claude Code deste app suporta um gatilho de fim de sessão (Stop) para lembrar isso automaticamente. Não verifiquei.

**P-C. Abertura de sessão mostra o estado.**
Ao abrir uma conversa, o gerente lê a `agent_task` aberta, o último `SESSOES.md`, o `git status` e o `git log` desde a última entrada, e responde com "onde paramos" e "o que falta". Hipótese: um gatilho de início de sessão (SessionStart) faz isso sem depender de o dono pedir. Não verifiquei se existe neste app.

**P-D. Publicação registrada.**
Cada tarefa com código ganha o campo `publicado_em` e o hash do commit publicado. O Auditoria confere a publicação ao vivo e marca `publicado`. Assim "publiquei no Lovable" vira um registro, e não uma lembrança.

**Orquestração (a "skill mãe"):**
O gerente é a mãe. Ele cria e move as `agent_task`, decide quem é acionado (tabela de roteamento) e não executa. Cada setor é um cérebro: guarda o próprio diário, lê e grava só as tarefas do seu setor. A Memória do Backoffice continua sendo quem garante que o registro aconteceu.

## 6. Proteção do cliente (o que não pode quebrar)
- **Caminho do cliente fica intocado pelo RAG.** Checkout, carrinho e pagamento não chamam LLM. Nenhum passo de IA entra no pagamento.
- **Primeiro uso é interno.** Gerente e agentes. Atendimento a cliente só com decisão do dono e com ensaio separado.
- **Publicação só depois da conferência da Auditoria** (P-D). Mudança que a Auditoria não confere não sai.
- **Plano de volta:** cada publicação guarda o commit anterior; se algo quebrar, volta-se ao commit conhecido.

## 7. Riscos
- R1. Dois escritores (humano, Claude, Lovable) no mesmo repositório. Mitigação: regra de quem commita, e o Lovable só publica a partir de commit revisado. Precisa de decisão do dono sobre o fluxo com o Lovable.
- R2. Supabase como fonte viva exige cuidado com acesso: a tabela não guarda segredos nem dados pessoais de cliente.
- R3. Mais uma camada para manter. Mitigação: começar só com P-A e P-B, que são as duas que resolvem a dor principal.
- R4. Gatilhos de início e fim de sessão podem não existir neste app (hipótese). Mitigação: se não existirem, o gerente faz a leitura de abertura pelo pedido "onde paramos" e o registro fica como regra obrigatória.

## 8. Ordem de aplicação (proposta)
- [ ] **O1.** Decidir com o dono o fluxo com o Lovable (quem commita, quem publica). Requer decisão.
- [ ] **O2.** Criar as tabelas `agent_task` e `agent_handoff` (migração). Requer ok. Backoffice Executor aplica.
- [ ] **O3.** Atualizar `docs/SESSOES.md` com as entradas de 15 a 17/10 que faltam. Memória faz, requer ok (é doc de registro).
- [ ] **O4.** Gerente passa a ler e gravar a `agent_task` ao abrir e fechar blocos. Requer ok (é skill).
- [ ] **O5.** Verificar se o app tem gatilhos de início e fim de sessão. Requer ok para testar o hook.
- [ ] **O6.** Campo `publicado_em` e conferência da Auditoria por publicação. Requer ok.
- [ ] **O7.** Só depois: RAG sobre os registros commitados (ver `docs/planos/rag-base-conhecimento.md`).
- [ ] **O8.** Teste: trabalhar um bloco no HOME, fechar, abrir no TRABALHO e checar se o "onde paramos" bate. Repetir no sentido inverso.

## 9. Decisões do dono
1. O fluxo com o Lovable: o Lovable pode commitar direto no `main`, ou só publicar a partir de commit seu?
2. Aceita o Supabase como fonte viva do "onde paramos"?
3. RAG vem depois de O6, ou antes?
4. Quer que eu comece pela ordem O2 a O4 (continuidade) e deixe o RAG para depois?
