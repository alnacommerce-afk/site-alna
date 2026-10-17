# Novo quadro de funcionários (rascunho para aprovação do dono)

**Status: rascunho.** Nada foi renomeado, movido nem aplicado. Cada etapa só roda com o "ok" do dono.

## Quem comanda

- **Dono:** dá comandos, pede relatórios e aprova. É o único que autoriza execução.
- **Gerente:** é a peça central e fala com o dono e com todos os agentes. Recebe o comando, repassa ao agente responsável e acompanha. Quando o dono pede relatório ou resposta, avalia com o agente e traz a resposta. Pode dar comandos diretos ao Executor do Backoffice e pode salvar no conhecimento do agente responsável o que foi feito. Não executa.

## Setores

| Setor | Quem faz | Função |
|---|---|---|
| **Executor do Backoffice** | `backoffice-executor` | Único que escreve nos arquivos do site, no admin e no banco. Executa só os planos aprovados, para todos os setores. Não guarda conhecimento. |
| **Memória do Backoffice** | `backoffice` (absorve Escrivão e Carteiro) | Registros em `SESSOES.md`, acompanha cada execução, frete e entregas, guarda o conhecimento do próprio setor. Não executa. |
| **Auditoria** (independente) | Ex-Auditor com Revisor, Detetive, Cofre | Avalia, planeja e monta o plano de conferência. Confere a execução. Investiga causas quando algo dá errado (Detetive). Guarda o inventário de chaves e senhas, sem valores (Cofre). Não executa. |
| **Arquitetura** (independente) | Arquiteto | Planeja, avalia e cria o plano técnico de cada mudança. Confere a execução. Não executa. |
| **Financeiro** | Caixa, pagamentos e cobrança | Pagamentos, cobrança e a medição da caixa "Salve seu carrinho". Planeja e confere no seu domínio. Não executa. |
| **Vendas** | Vendedor, Estoquista, Vitrine | E-mails, campanhas, cupons de marketing, estoque e vitrine. Planeja e confere no seu domínio. Não executa. |
| **Jurídico** | Ex-Advogado do Google | Google Ads, contestações e demais acompanhamentos do site que forem definidos. Planeja e confere no seu domínio. Não executa. |

## Pessoal (fora do quadro)

- **Vigia:** atualiza o repositório a cada comando. É pessoal de cada computador.

## Como funciona um pedido

1. **Comando:** o dono fala com o gerente.
2. **Repasse:** o gerente manda o pedido ao agente responsável e aos agentes envolvidos.
3. **Plano:** cada agente envolvido monta a parte do plano do seu domínio. O plano vira um checklist em `docs/planos/`.
4. **Ok:** o dono aprova. Sem ok, nada é executado.
5. **Execução:** o Executor do Backoffice executa passo a passo, marcando cada um no checklist. A Memória do Backoffice acompanha. Os agentes envolvidos acompanham.
6. **Conferência:** cada agente confere a execução do seu passo e marca "conforme o plano" ou "desvio". Desvio volta ao gerente e ao dono.
7. **Relato:** o Executor do Backoffice relata o que foi feito; a Memória registra e leva ao agente responsável. O agente responde se ficou bom ou o que deve ser ajustado. O gerente consolida e informa o dono.
8. **Conhecimento:** o resultado é salvo no diário e na skill do agente responsável pela tarefa. Esse agente é o dono do conhecimento daquele assunto.

## Pedido de relatório ou resposta

O dono pede ao gerente. O gerente avalia com o agente responsável e traz a resposta. Não há execução nesse caso.

## Conhecimento

- Cada agente guarda o seu conhecimento na própria skill e no diário.
- Quando uma tarefa envolve mais de um agente, o responsável principal guarda o registro. Os demais recebem um apontamento.
- Toda mudança que altera um setor atualiza a skill desse setor. A atualização é feita pelo Executor do Backoffice e aprovada pelo dono; a Memória registra.
- Nenhum dado pode ficar sem dono. Se um registro não tiver responsável, o gerente aponta e pede a decisão do dono.

## Migração (ordem sugerida, em etapas)

1. **Gerente:** atualizar a tabela de roteamento e as regras de comunicação (texto antes e depois para aprovação).
2. **Backoffice:** criar o setor e absorver as funções do Escrivão e do Carteiro. Os diários atuais continuam, com o histórico preservado.
3. **Auditoria:** tornar independente, com Detetive e Cofre dentro dela.
4. **Financeiro:** criar o setor e absorver a função do Caixa.
5. **Jurídico:** renomear o Advogado do Google, mantendo o diário e o histórico.
6. **Arquitetura:** criar o agente quando o desenho for aprovado.
7. **Vendas:** criar o setor (com Vendedor, Estoquista e Vitrine) quando os funcionários forem aprovados.
8. **Limpeza:** atualizar o `docs/agentes/README.md` e as mensagens dos gatilhos (`.claude/hooks/gatilhos.ps1`).

## Cuidados

- Skills novas e renomeadas só são carregadas em conversa nova. Cada setor precisa ser testado de novo depois de migrado.
- Os diários antigos não são apagados. Eles continuam como histórico.
- A mudança da skill do gerente só entra depois do "ok" do dono sobre o texto antes e depois.
- O gerente pode fazer registros nos diários sem o "ok". Qualquer mudança no site, no código ou no banco só com o "ok".

## Status da migração (16/10/2026)

1. **Gerente:** feito (skill atualizada com comunicação de duas vias e mapa de transição).
2. **Backoffice:** feito (skill `backoffice` com as funções do Escrivão e do Carteiro). Falta teste em conversa nova.
3. **Auditoria:** feito (skill `auditoria` e subagente `auditoria`, com Detetive e Cofre dentro). Falta teste em conversa nova.
4. **Financeiro:** feito (skill `financeiro` com a medição da caixa). Pagamentos e cobrança ainda sem teste real.
5. **Jurídico:** feito (antigo Advogado do Google, com o histórico preservado). Falta teste em conversa nova.
6. **Arquitetura:** feito (skill `arquiteto`). Falta teste em conversa nova.
7. **Vendas:** **pendente.** Vendedor, Estoquista e Vitrine ainda não têm desenho aprovado. Quando o dono aprovar, cria-se o setor.
8. **Limpeza:** feito. `docs/agentes/README.md`, mensagens do gatilho (`.claude/hooks/gatilhos.ps1`) e o mapa de transição do gerente atualizados.

As skills `escrivao` e `caixa` ficaram como histórico, com aviso de que a função foi absorvida.
