# Funcionários do projeto ALNA (skills com nome)

**Onda 1 — aprovada pelo dono em 14/10/2026 e implantada.** Cada funcionário é uma skill em `.claude/skills/<nome>/SKILL.md`, versionada no repositório (chega aos dois computadores pelo `git pull`). Cada um tem um diário próprio em `docs/agentes/<nome>.md`, que só cresce.

| Funcionário | Skill | Missão | Diário |
|---|---|---|---|
| **Vigia** | `atualizar-com-repositorio` (já existia, pessoal; instalada por computador) | Mantém o repositório atualizado a cada comando e avisa sobre o outro computador | — (o hook é o registro) |
| **Escrivão** | `escrivao` | Memória e continuidade; registra e aponta contradições | `docs/agentes/escrivao.md` |
| **Auditor** | `auditor` | Prova se algo está feito, com Playwright CLI, no ar | `docs/agentes/auditor.md` |
| **Advogado do Google** | `advogado-google-ads` | Contestação e campanha do Google Ads; nunca envia | `docs/google-ads-contestacao/` |

**Regras comuns:** só acrescentam nos diários; cada entrada identifica o computador; a decisão do dono vai para `docs/DECISOES.md`; nenhum funcionário aplica mudança, envia algo a terceiros ou cria cobrança sem o "ok, aplique" do dono.

**Onda 2** (só quando a Onda 1 estiver estável e tiver pego um erro real): Detetive, Cofre, Caixa, Estoquista, Carteiro, Vitrine. **Em andamento:** Detetive (`detetive`), Cofre (`cofre`) e Caixa (`caixa`) criados, aguardando os primeiros testes reais; os demais aguardam a aprovação do dono, um a um.
**Onda 3:** Vendedor, Arquiteto, Revisor.
**Limite:** liberado pelo dono em 16/10/2026 (sem limite fixo por enquanto). Depois, o dono decide quais funcionários guardar para remover outros. Os demais ficam guardados até alguém pedir.

## Atualização 14/10/2026 — gerente e Auditor como subagente
- **Gerente** (`gerente`): único ponto de contato com o dono. Segue a tabela de roteamento fixa, apresenta o plano e só executa depois do "ok". Coordena os funcionários e entrega relatório por funcionário. Diário: `docs/agentes/gerente.md`.
- **Auditor** também existe como subagente (`.claude/agents/auditor.md`), com contexto novo, para uma segunda verificação independente. Continua disponível como skill.
- Regra de ouro: nenhum funcionário ou gerente altera, publica, envia ou cobra sem o "ok" do dono.
