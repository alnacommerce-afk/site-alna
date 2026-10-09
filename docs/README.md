# docs/ — índice (onde está cada coisa)

| Preciso saber... | Arquivo |
|---|---|
| **O que está pendente / onde paramos / o que depende de quem** | [`PENDENCIAS.md`](PENDENCIAS.md) |
| **Por que fizemos assim / o que o dono decidiu e quando** (inclui o que foi DESFEITO) | [`DECISOES.md`](DECISOES.md) |
| Google Ads suspenso: painel "o que falta", texto da contestação, fatos verificados | [`google-ads-contestacao/`](google-ads-contestacao/) (`STATUS.md`, `RASCUNHO-2a-contestacao.md`, `EVIDENCIAS.md`, `README.md`) |
| De onde veio uma imagem/banner e cuidados (IA, formato, posição) | [`ATIVOS-VISUAIS.md`](ATIVOS-VISUAIS.md) |
| Cada mudança feita no banco/código pelo Claude (data, o que, por quê, como reverter) | [`db-changes-applied-by-claude.md`](db-changes-applied-by-claude.md) |
| Integrações de marketing (Meta, Google, feeds) | [`marketing-integrations.md`](marketing-integrations.md) |
| Regras permanentes de trabalho (sócio, velocidade, Lovable) | [`../AGENTS.md`](../AGENTS.md) |
| Medidas de velocidade da Home | `../home-cloudflare/README.md` |

## Como responder quando o dono perguntar sobre algo do passado
1. **Procurar antes de responder:** `docs/DECISOES.md` e `docs/PENDENCIAS.md`, depois `git log --all --grep=<palavra>`, `docs/db-changes-applied-by-claude.md`, a memória (`MEMORY.md`) e, se for dado, o banco (só leitura).
2. Se **não achar**, dizer "isso não está registrado" e perguntar — **nunca inventar** — e registrar a resposta aqui no mesmo commit.
3. Ao aplicar, desfazer ou decidir algo: registrar em `DECISOES.md` (e, se mudou código/banco, em `db-changes-applied-by-claude.md`) **no mesmo commit**, mais push e espelho no Drive.
