# docs/ — índice (onde está cada coisa)

| Preciso saber... | Arquivo |
|---|---|
| **O que está pendente / onde paramos / o que depende de quem** | [`PENDENCIAS.md`](PENDENCIAS.md) |
| **Por que fizemos assim / o que o dono decidiu e quando** (inclui o que foi DESFEITO) | [`DECISOES.md`](DECISOES.md) |
| Google Ads suspenso: painel "o que falta", texto da contestação, fatos verificados | [`google-ads-contestacao/`](google-ads-contestacao/) (`STATUS.md`, `RASCUNHO-2a-contestacao.md`, `EVIDENCIAS.md`, `README.md`) |
| De onde veio uma imagem/banner e cuidados (IA, formato, posição) | [`ATIVOS-VISUAIS.md`](ATIVOS-VISUAIS.md) |
| Cada mudança feita no banco/código pelo Claude (data, o que, por quê, como reverter) | [`db-changes-applied-by-claude.md`](db-changes-applied-by-claude.md) |
| Modelos de mensagem para atacado (WhatsApp, Instagram, e-mail, ligação) + política do WhatsApp | [`WHATSAPP-ATACADO-MODELOS.md`](WHATSAPP-ATACADO-MODELOS.md) |
| Meta Ads do zero (passo a passo: portfólio, Página, Instagram, WhatsApp, anúncio de conversa) | [`META-ADS-PASSO-A-PASSO.md`](META-ADS-PASSO-A-PASSO.md) |
| Plano B de tráfego (sem Google Ads): canais, passos, orçamento sugerido e calendário | [`PLANO-B-TRAFEGO.md`](PLANO-B-TRAFEGO.md) |
| **PROPOSTA** de agentes e skills por responsabilidade, com garantia de não perder informação (aguarda "ok, aplique") | [`PLANO-AGENTES-E-SKILLS.md`](PLANO-AGENTES-E-SKILLS.md) |
| Hook + skill que atualizam o repositório a cada comando (como funciona, testes, cópia do script, como ligar em outra máquina) | [`HOOK-ATUALIZAR-REPOSITORIO.md`](HOOK-ATUALIZAR-REPOSITORIO.md) |
| **Passo a passo para ligar o outro computador** (instalador, teste de continuidade, regras do dia a dia) | [`PASSO-A-PASSO-OUTRO-COMPUTADOR.md`](PASSO-A-PASSO-OUTRO-COMPUTADOR.md) |
| **Diário das sessões**: quem fez o quê em qual computador (Computador HOME e o outro) | [`SESSOES.md`](SESSOES.md) |
| Relatório de vendas do FinMarket HUB (campos, parâmetros, como testar) | [`sales-report-finmarket.md`](sales-report-finmarket.md) |
| Integrações de marketing (Meta, Google, feeds) | [`marketing-integrations.md`](marketing-integrations.md) |
| Regras permanentes de trabalho (sócio, velocidade, Lovable) | [`../AGENTS.md`](../AGENTS.md) |
| Medidas de velocidade da Home | `../home-cloudflare/README.md` |

## Como responder quando o dono perguntar sobre algo do passado
1. **Procurar antes de responder:** `docs/DECISOES.md` e `docs/PENDENCIAS.md`, depois `git log --all --grep=<palavra>`, `docs/db-changes-applied-by-claude.md`, a memória (`MEMORY.md`) e, se for dado, o banco (só leitura).
2. Se **não achar**, dizer "isso não está registrado" e perguntar — **nunca inventar** — e registrar a resposta aqui no mesmo commit.
3. Ao aplicar, desfazer ou decidir algo: registrar em `DECISOES.md` (e, se mudou código/banco, em `db-changes-applied-by-claude.md`) **no mesmo commit**, mais push e espelho no Drive.

## Abrindo uma conversa nova
Diga **"retome"** (ou "atualize-se com o repositório"). O Claude executa o protocolo "retomar" do `AGENTS.md`: `git pull`, lê estes arquivos, olha o `git log` e responde com onde paramos, o que falta e o que mudou. Conte também o que aconteceu fora do sistema (Hostnet, Google, contador) — ele registra na hora.
