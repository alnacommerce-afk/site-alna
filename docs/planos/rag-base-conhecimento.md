# Plano: RAG e LLM para a base de conhecimento

**Autor:** Arquiteto (19/10/2026). **Status:** proposta. Nada foi aplicado. Cada passo só roda com o "ok, aplique" do dono, pelo gerente.

## Objetivo
Responder perguntas sobre o projeto ALNA (decisões, pendências, processos, produtos) buscando primeiro nos documentos do repositório e usando uma LLM só para redigir a resposta com fonte.

## Fatos (verificados agora)
- F1. A base hoje é a pasta `docs/`: 40 arquivos `.md`. Inclui 15 diários em `docs/agentes/`, `DECISOES.md`, `PENDENCIAS.md` e a pasta `docs/google-ads-contestacao/` (fonte: `find`).
- F2. Há 14 skills em `.claude/skills/` e 36 Edge Functions em `supabase/functions/` (fonte: `ls`).
- F3. A extensão `vector` (pgvector 0.8.2) está disponível no projeto Supabase `ogxsdptftgxrujkfscvi`, mas **não instalada** (fonte: `list_extensions`).
- F4. `pg_net` (HTTP assíncrono) está instalado, e `pg_cron` também (fonte: `list_extensions`). O banco já agenda jobs com `pg_cron`.
- F5. Não há uso de LLM nem de embeddings nas Edge Functions nem em `src/` (fonte: `grep` por anthropic, openai, embedding, voyage).
- F6. Nove arquivos de `docs/` contêm padrão de CPF ou e-mail pessoal: `agentes/caixa.md`, `DECISOES.md`, os quatro arquivos de `google-ads-contestacao/`, `marketing-integrations.md` e `PENDENCIAS.md` (fonte: `grep` com padrão de CPF e `@gmail.com`; a lista traz só os nomes).
- F7. Nenhum padrão de chave ou senha foi encontrado em `docs/` nem em `.claude/` (fonte: `grep`). Isso não prova que não há segredo; só que os padrões comuns não apareceram.

## Hipóteses (não verificadas)
- H1. Anthropic não oferece API de embeddings. Para indexar, é preciso outro provedor de embeddings (ex.: Voyage) ou um modelo local. Não verifiquei preço nem disponibilidade hoje.
- H2. A busca vetorial sobre ~40 arquivos cabe no plano atual do Supabase. Precisa medir.
- H3. O custo mensal fica baixo se as perguntas forem internas (poucas dezenas por dia). Não medi.

## Modelos (sugestão, com base no que a instrução do projeto indica)
- **Resposta:** `claude-sonnet-5-5` (qualidade para redigir com fonte).
- **Triagem e classificação barata:** `claude-haiku-5-5`, se for preciso.
- **Embeddings:** a definir (H1).

## Arquitetura proposta
1. **Ingestão:** lê os `.md` de `docs/` (e, se o dono aprovar, `.claude/skills/`), divide em trechos por título, remove dados pessoais (F6) e grava em uma tabela com `vector`.
2. **Atualização:** um job no `pg_cron` reindexa só os arquivos alterados (compara hash). Alternativa: um passo no fluxo de commit.
3. **Consulta:** uma Edge Function recebe a pergunta, busca os 5 a 8 trechos mais próximos, monta o prompt com as fontes e chama a LLM. A resposta sai com o caminho do arquivo.
4. **Segredos:** a chave da API fica no Supabase Vault (já existe no projeto, fonte: extensão `supabase_vault`), nunca no código nem nos documentos.
5. **Acesso:** só usuários autorizados. Começa interno (gerente e agentes). Atendimento a cliente só com decisão do dono.

## Riscos
- R1. **Dados pessoais no índice** (F6). Mitigação: redigir CPF e e-mail antes de indexar, e excluir a pasta `google-ads-contestacao/` do índice até o dono decidir.
- R2. **Resposta errada com cara de certa.** Mitigação: toda resposta cita a fonte; se não achar fonte, a resposta diz "não encontrei".
- R3. **Documento desatualizado** (ex.: `PENDENCIAS.md` de 14/10, já apontado pelo Escrivão). Mitigação: mostrar a data do arquivo junto com a fonte.
- R4. **Custo de API sem limite.** Mitigação: limite de chamadas por dia e alerta de gasto.
- R5. **Chave vazando.** Mitigação: Vault e nenhuma chave em arquivo do repositório.

## Checklist de aplicação (ordem)
- [ ] **P1.** Decidir o uso: interno ou também para cliente. Requer decisão do dono.
- [ ] **P2.** Escolher o provedor de embeddings e medir custo. Requer decisão do dono.
- [ ] **P3.** Migração: `CREATE EXTENSION vector`, tabela de trechos e índice. Requer ok. Backoffice Executor aplica.
- [ ] **P4.** Script de ingestão com redação de dados pessoais, rodado em um conjunto de teste (só leitura nos documentos). Requer ok.
- [ ] **P5.** Edge Function de consulta, com limite de uso. Requer ok.
- [ ] **P6.** Teste: 20 perguntas com resposta conhecida (ex.: "qual o status da 3ª contestação?", "onde está a chave `finmarket_hub_api`?"). Auditoria confere. Medir acerto e se a fonte está certa.
- [ ] **P7.** Job de atualização no `pg_cron`. Requer ok.
- [ ] **P8.** Registrar no diário e no `docs/agentes/arquiteto.md`.

## Pendências de decisão do dono
1. Uso interno apenas, ou também atendimento a cliente?
2. Pode indexar `.claude/skills/` e os diários, ou só `docs/` de decisões e pendências?
3. Google Ads: fica de fora do índice por enquanto?
4. Orçamento mensal de API que você aceita?
5. Quem pode fazer perguntas: só você, ou também os agentes?

## Impacto em outros setores
- Backoffice Executor: aplica P3, P4, P5 e P7 depois do ok.
- Auditoria: P6 e teste de resposta errada.
- Jurídico: precisa decidir se o Google Ads entra no índice (R1).
- Financeiro: estimativa de custo mensal junto com P2.
