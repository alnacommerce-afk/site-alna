# Diário do Arquiteto

Acrescenta sempre; nunca apaga. Cada entrada: data, computador, pedido, plano apresentado, decisão do dono, o que foi conferido e os desvios.

## 2026-10-16 — Computador HOME — implantação
- Skill `arquiteto` criada (agente independente: planeja e confere; não executa).
- Desenho aprovado pelo dono junto com o novo quadro (ver `docs/QUADRO-AGENTES.md`).
- Ainda não foi acionado. Teste pendente: sessão nova dentro de `C:\Users\Pichau\dev\site-alna`, com uma pergunta de desenho já conhecida.

## 2026-10-16 — Computador HOME — pedido direcionado pelo gerente (planejamento; nada executado)
- Foto da variação primária (fase 2): conferir a parte técnica da regra depois da escolha do dono.

## 2026-10-16 — Computador HOME — desenho do Backoffice em duas sub-skills (plano entregue; nada aplicado)
- Pedido (gerente, com ok do dono): dividir o Backoffice em executora (só executa) e memória (registros, frete e entregas, guarda do conhecimento).
- Plano em `docs/planos/backoffice-duas-sub-skills.md`, com fatos (F1 a F8), hipóteses (H1 e H2), checklist de P1 a P8 e riscos.
- Decisão pendente do dono: C1 (conhecimento com a memória ou com o agente responsável, porque a regra 5 atual diz uma coisa e o pedido de 16/10 diz outra) e o nome da executora (recomendado: manter "Backoffice").
- Conferido: nenhuma skill foi alterada. Só foi criada a pasta `docs/planos/` e o plano.

## 2026-10-19 — Computador HOME — RAG interno aplicado em parte (aprovado pelo dono: Voyage, uso interno)
- Migração `rag_kb_chunk_pgvector` aplicada no Supabase: extensão `vector` no schema `extensions`, tabela `public.kb_chunk` (embedding de 1024 dimensões, modelo `voyage-3.5`), índice HNSW por cosseno, RLS ligado sem políticas públicas, função `public.kb_buscar`.
- Script `scripts/rag/ingest.mjs` criado: indexa só o que está commitado (`git show HEAD`), redige CPF e e-mail, exclui `docs/google-ads-contestacao/`, reindexa só o que mudou. Ainda não foi executado: faltam as chaves.
- Dimensão 1024 e modelo `voyage-3.5` vieram de fontes de terceiros (WebSearch). Confirmar na documentação oficial da Voyage antes da primeira indexação.
- Pendente: chaves (VOYAGE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) para rodar o script; Edge Function de consulta (sem deploy, precisa do ok); chave da LLM de resposta.

## 2026-10-22 — Computador HOME — RAG com Voyage removido (decisão do dono)
- Removidos: `scripts/rag/` (script de indexação), tabela `public.kb_chunk` e função `public.kb_buscar`. A extensão `vector` ficou instalada por ser genérica.
- Motivo: a Voyage exige forma de pagamento para sair do limite gratuito de 3 requisições por minuto, e o dono decidiu não cadastrar por enquanto.
- Plano `docs/planos/rag-base-conhecimento.md` fica como histórico, suspenso.
