# Plano: Backoffice em duas sub-skills

**Autor:** Arquiteto (16/10/2026). **Status:** proposta. Nada foi aplicado. Cada passo só roda com o "ok, aplique" do dono, pelo gerente.

## Ordem do dono (16/10)
- **Executora:** só executa os planos aprovados dos setores (arquivos do site, admin e banco).
- **Memória:** fica com tudo o que era do Backoffice: registros em `docs/SESSOES.md`, acompanhamento de frete e entregas (antiga função do Carteiro), ajustes de documentos de registro e guarda do conhecimento.
- **Regra:** a execução não depende da memória. Se a memória falhar, a execução segue e a falha fica registrada.

## Fatos (lidos nos arquivos)
- F1. Hoje existe uma só skill: `.claude/skills/backoffice/SKILL.md` (27 linhas), com as funções de memória, frete e ajustes no site (fonte: o próprio arquivo).
- F2. O diário `docs/agentes/backoffice.md` tem 16 linhas e uma entrada de implantação, sem teste real (fonte: o diário).
- F3. Sete skills dizem "quem executa é o Backoffice": `vitrine`, `vendedor`, `financeiro`, `estoquista`, `juridico`, `arquiteto` e `auditoria` (fonte: grep em `.claude/skills/`).
- F4. A tabela de roteamento de `.claude/skills/gerente/SKILL.md` cita "Backoffice (Escrivão registra)" nas linhas 23, 29 e 36, e "Backoffice (Carteiro)" na linha 32. Também tem o mapa de transição nas linhas 45 e 46 (fonte: `gerente/SKILL.md`).
- F5. `.claude/hooks/gatilhos.ps1`, linha 34, manda "acione o Backoffice para registrar o bloco no diário (docs/SESSOES.md)" (fonte: o hook).
- F6. A pasta `docs/planos/` não existe (fonte: `ls`). O próprio fluxo do Arquiteto pede esse lugar, então ela precisa ser criada.
- F7. `.claude/agents/` tem só `auditoria.md`. Não há subagente do Backoffice.
- F8. A regra 5 da skill atual diz: "quem guarda o conhecimento é o responsável", e não a memória do Backoffice (fonte: `backoffice/SKILL.md`).

## Hipóteses (não verificadas)
- H1. Skill nova só carrega em sessão nova (já observado nos testes da Onda 1; fonte: `docs/SESSOES.md`, 14/10).
- H2. Manter o nome "Backoffice" para a executora faz as sete skills de F3 continuarem corretas sem edição.

## Decisão do dono sobre o conhecimento (C1, resolvida em 16/10)
- Cada setor guarda o que ele mesmo fez. O Arquiteto guarda o que o Arquiteto fez.
- A execução feita pela executora fica registrada na memória do Backoffice.
- Por isso, o registro de execução é da memória, e o assunto continua com o setor que planejou.

## Desenho proposto
- **Nomes:** `backoffice` continua como a **memória** (mesmo nome, mesmo diário, sem perder histórico). A **executora** vira `backoffice-executor`. Assim o gerente e as sete skills de F3 continuam apontando para o nome que já conhecem (H2 e recomendação).
- **Diário:** `docs/agentes/backoffice.md` continua sendo o da memória. A executora não tem diário próprio: o que ela faz é registrado pela memória, que a acompanha.
- **Fluxo de uma tarefa:** (1) gerente entrega o plano aprovado à executora; (2) a executora executa e marca cada passo no checklist de `docs/planos/`; (3) a memória acompanha, confere o registro, grava o resultado em `docs/SESSOES.md` e no diário, e avisa o agente responsável; (4) o agente responsável guarda o assunto no próprio diário (ver C1).

## Checklist de aplicação (ordem)
- [ ] **P1.** Criar `docs/planos/` com um `README.md` curto. Não afeta o site. Requer ok.
- [x] **P2.** Criar `.claude/skills/backoffice-executor/SKILL.md` com: só executa planos aprovados; sem diário próprio; regras de "não publica", "deploy só com ok" e "marca cada passo". Requer ok.
- [x] **P3.** Editar `.claude/skills/backoffice/SKILL.md`: retirar a parte de execução no site; manter memória, frete e registros; reescrever a regra 5 conforme a decisão de C1 (já decidida, ver abaixo). Requer ok e texto antes e depois.
- [x] **P4.** Editar `.claude/skills/gerente/SKILL.md`: linhas 23 a 36 e 45 a 46, separando memória e executora. Requer ok, porque é skill.
- [x] **P5.** Editar `.claude/hooks/gatilhos.ps1`, linha 34: trocar "acione o Backoffice" por "acione a memória do Backoffice". Requer ok, porque é hook.
- [ ] **P6.** Atualizar `docs/QUADRO-AGENTES.md` (setor Backoffice e mapa de transição) e `docs/agentes/README.md`.
- [ ] **P7.** Registrar em `docs/SESSOES.md` e no diário da memória.
- [ ] **P8.** Teste em sessão nova: (a) pedir uma execução de teste pequena e ver se a executora só executa e a memória registra; (b) pedir "onde paramos" e ver se a memória responde sem executar nada.

## Riscos
- R1. Mudar o gerente e o hook sem testar antes pode mandar uma tarefa para o agente errado. Mitigação: P4 e P5 só depois de P2 e P3, e teste em P8.
- R2. A skill atual ainda não foi testada de verdade (F2). Mudar agora significa testar duas peças novas em vez de uma. Mitigação: P8.
- R3. Se C1 não for decidida, a regra 5 fica contraditória. Mitigação: não aplicar P3 antes da decisão.
- R4. Skills carregam só em sessão nova (H1). Mitigação: P8 numa sessão nova.

## Impacto em outros setores
- Nenhum setor precisa mudar o texto para continuar funcionando, se H2 valer.
- O Vendedor, o Financeiro, o Jurídico, a Vitrine e o Estoquista continuam dizendo "quem executa é o Backoffice". Com H2, isso passa a ser a executora.

## Pendências de decisão do dono
1. C1: resolvida (ver acima).
2. Nomes escolhidos pelo dono (16/10): **Executor do Backoffice** (pasta `backoffice-executor`) e **Memória do Backoffice** (pasta atual `backoffice`, para preservar o histórico e as referências). Os textos das sete skills que dizem "quem executa é o Backoffice" passam a dizer "o Executor do Backoffice".
3. Você aprova P1 a P8 em ordem, um "ok, aplique" por passo?
