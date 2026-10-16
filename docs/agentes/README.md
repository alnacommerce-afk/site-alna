# Funcionários do projeto ALNA (skills com nome)

**Onda 1 — aprovada pelo dono em 14/10/2026 e implantada.** Cada funcionário é uma skill em `.claude/skills/<nome>/SKILL.md`, versionada no repositório (chega aos dois computadores pelo `git pull`). Cada um tem um diário próprio em `docs/agentes/<nome>.md`, que só cresce.

## Quadro atual (migração de 16/10/2026)

Detalhes e regras em `docs/QUADRO-AGENTES.md`.

| Setor / funcionário | Skill | Missão | Diário |
|---|---|---|---|
| **Gerente** | `gerente` | Fala com o dono e com todos os agentes; repassa comandos; só executa com o "ok" do dono | `docs/agentes/gerente.md` |
| **Backoffice** (absorve o Escrivão e o Carteiro) | `backoffice` | Único que escreve no site (front, back, admin); memória e registros; frete e entregas | `docs/agentes/backoffice.md` (antes: `escrivao.md`) |
| **Auditoria** (independente; inclui Detetive e Cofre) | `auditoria`, `detetive`, `cofre` | Avalia, planeja e confere a execução; prova ao vivo; investiga causas; inventário de chaves | `docs/agentes/auditoria.md` |
| **Financeiro** (absorve o Caixa) | `financeiro` | Pagamentos, cobrança e medição da caixa "Salve seu carrinho" | `docs/agentes/financeiro.md` (histórico da caixa: `caixa.md`) |
| **Jurídico** (antigo Advogado do Google) | `juridico` | Google Ads e demais acompanhamentos do site | `docs/agentes/juridico.md` |
| **Arquitetura** (independente) | `arquiteto` | Planeja, avalia e confere mudanças técnicas | `docs/agentes/arquiteto.md` |
| **Vendas** (Vendedor, Estoquista, Vitrine) | — | Ainda não criado: precisa do desenho aprovado | — |
| **Vigia** (pessoal, fora do quadro) | `atualizar-com-repositorio` | Mantém o repositório atualizado a cada comando | — (o hook é o registro) |

Skills antigas `escrivao` e `caixa` ficaram só como histórico.

**Regras comuns:** só acrescentam nos diários; cada entrada identifica o computador; a decisão do dono vai para `docs/DECISOES.md`; nenhum funcionário aplica mudança, envia algo a terceiros ou cria cobrança sem o "ok, aplique" do dono.

**Onda 2** (só quando a Onda 1 estiver estável e tiver pego um erro real): Detetive, Cofre, Caixa, Estoquista, Carteiro, Vitrine. **Em andamento:** Detetive (`detetive`), Cofre (`cofre`) e Caixa (`caixa`) criados, aguardando os primeiros testes reais; os demais aguardam a aprovação do dono, um a um.
**Onda 3:** Vendedor, Arquiteto, Revisor.
**Limite:** liberado pelo dono em 16/10/2026 (sem limite fixo por enquanto). Depois, o dono decide quais funcionários guardar para remover outros. Os demais ficam guardados até alguém pedir.

## Atualização 14/10/2026 — gerente e Auditor como subagente
- **Gerente** (`gerente`): único ponto de contato com o dono. Segue a tabela de roteamento fixa, apresenta o plano e só executa depois do "ok". Coordena os funcionários e entrega relatório por funcionário. Diário: `docs/agentes/gerente.md`.
- **Auditor** também existe como subagente (`.claude/agents/auditor.md`), com contexto novo, para uma segunda verificação independente. Continua disponível como skill.
- Regra de ouro: nenhum funcionário ou gerente altera, publica, envia ou cobra sem o "ok" do dono.
