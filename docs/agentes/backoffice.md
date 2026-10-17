# Diário do Backoffice

Acrescenta sempre; nunca apaga. Cada entrada: data, computador, o que foi executado, em quais arquivos, quais passos do checklist, o que o agente responsável respondeu e o que ficou pendente.

Histórico anterior: o Escrivão continua registrando em `docs/agentes/escrivao.md` e o Carteiro não tem diário separado ainda.

## 2026-10-16 — Computador HOME — implantação (migração, passo 2)
- Setor Backoffice criado. Absorve as funções do Escrivão (memória e registros) e do Carteiro (frete e entregas).
- Único setor que escreve nos arquivos do site.
- Ainda não foi acionado. Teste pendente: sessão nova dentro de `C:\Users\Pichau\dev\site-alna`, com uma pergunta de registro já conhecida.

## 2026-10-16 — Computador HOME — pedido direcionado pelo gerente (planejamento; nada executado)
- Campanha de 27/10 com 2 cupons: código e cupom novo, depois do ok.
- Ajuste de documento no Google Ads (STATUS.md) e linha 62 de PENDENCIAS.md (INPI): depois do ok.
- Registro desta sessão em docs/SESSOES.md.
- Testes 1 a 4 da Onda 1 no Computador TRABALHO: planejar com a Auditoria.

## 2026-10-16 — Computador HOME — virou Memória do Backoffice (ajuste das skills)
- A função de execução saiu desta skill e foi para a Executor do Backoffice (`backoffice-executor`).
- A Memória fica com: registros em `docs/SESSOES.md`, acompanhamento de frete e entregas, contradições, documentos de registro (com ok) e acompanhamento das execuções da Executor.
- Pendente: teste em sessão nova e o gatilho de SESSOES em `.claude/hooks/gatilhos.ps1`.
