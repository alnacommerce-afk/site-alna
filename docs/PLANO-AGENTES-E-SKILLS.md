# Plano — agentes e skills por responsabilidade (PROPOSTA de 14/10/2026)

**Status: PROPOSTA. Nada foi criado além deste arquivo. Só aplicar com o "ok, aplique" do dono.**

## 1. O que o dono pediu (14/10/2026)
- "Não posso perder nenhuma informação de coisas que já tenha feito."
- Dividir as tarefas e ter **agentes exclusivos por assunto/atividade**. Exemplo dele: um agente só para a **contestação do Google**, que avalia outras fontes e, "assim que tiver retorno ou tiver que responder, saiba exatamente o que fazer sem esquecer de nada".
- Papéis que ele citou: pensar/planejar, contestação do Google, segurança do site, verificar se realmente fez, depurar, revisar, "e assim por diante".

## 2. Entendimento das fontes avaliadas

### 2.1 Repositório de Addy Osmani (`addyosmani/agent-skills`, lido em 14/10/2026)
- **O que é (README):** 25 skills (24 de ciclo de vida + 1 meta `using-agent-skills`), 9 comandos (`/spec /plan /build /test /constraints /review /webperf /code-simplify /ship`), 4 personas em `agents/` (`code-reviewer`, `test-engineer`, `security-auditor`, `web-performance-auditor`) e a regra "personas don't invoke personas".
- **Ideia central:** "process, not prose" — cada skill tem Overview, When to Use, Process, Rationalizations (tabela de desculpas e contra-argumentos), Red Flags e Verification; "Seems right is never sufficient". Fluxo: especificar, quebrar em tarefas pequenas, **uma fatia por vez**, verificar com evidência. `/build auto` implementa tudo após uma aprovação, com commit por tarefa.
- **O que adotar (ideias, não instalação):** a anatomia das skills (+ uma seção "quando NÃO usar", que ele não tem), tabelas de anti-racionalização adaptadas ao projeto, uma tarefa por vez com verificação por tarefa, personas como agentes separados que não chamam outros agentes.
- **O que NÃO adotar:** instalar o pacote inteiro. Motivos: (1) 25 skills pesam na lista de toda sessão; (2) cobre engenharia genérica e **não cobre** operação (Google Ads, pagamentos, e-mails, tráfego), que é o nosso maior risco; (3) `/build auto` (commit automático por tarefa) conflita com a regra do dono "nunca aplicar sem ok, aplique"; (4) trunk-based/`ship` conflitam com Lovable e com "não reescrever histórico"; (5) texto de terceiros que passa a instruir o agente no nosso repositório é risco de cadeia de suprimentos — se algo for copiado, revisar linha a linha e fixar a versão; (6) "production-grade" é afirmação do README sem evidência na própria página.

### 2.2 Playwright CLI da Microsoft (`@playwright/cli`, avaliado em 14/10/2026)
- **O que é (README):** CLI para agentes de código controlarem um navegador: abrir, clicar, preencher, screenshot, estado de login (`state-save`/`state-load`), console, requisições, trace, vídeo, emulação de celular. O README recomenda o CLI (e não o MCP) para agentes de código por gastar menos contexto.
- **Teste real (só leitura, fora do repositório):** versão 0.1.22; instalado com Node portátil v24.21.0 (zip de 35,9 MB) em `C:\Users\Pichau\pw-eval` (pode apagar a pasta); **usa o Chrome/Edge já instalados** (`--browser chrome`), sem baixar navegador; `/loja` aberta como celular: título correto, **0 erros e 0 avisos no console**, screenshot de 118 KB; `alna.sale/atacado` abriu a página de atacado correta.
- **Atritos encontrados:** (a) o PowerShell quebra o `eval` com funções longas ("too many arguments") — usar scripts em arquivo; (b) a primeira contagem de produtos deu 0 porque o catálogo carrega depois da casca da página — os testes precisam de esperas explícitas. Ou seja, há custo de manutenção.
- **Limites:** não substitui o Pix/cartão real (só existe Asaas de produção; o teste para antes de "Finalizar pedido"), nem e-mail na caixa do cliente, nem painéis do Google. Só há um banco (produção): formulário enviado grava dado real.
- **Área logada:** o arquivo de login salvo é um token de sessão do admin — fica **fora do repositório**, o dono faz o login uma vez numa janela aberta e eu **nunca vejo a senha**.

### 2.3 Decisão sobre o MCP (recomendação)
**Não adicionar o Playwright MCP agora.** O CLI cobre o que precisamos; o MCP carrega esquemas de ferramentas no contexto o tempo todo e o README o indica para sessões longas e exploratórias. O Claude já tem navegador embutido e extensão do Chrome. Rever só se surgir necessidade de exploração longa com estado.

## 3. Arquitetura proposta

| Camada | O que é | Guarda memória? |
|---|---|---|
| **docs/** | Fonte única de verdade do projeto (já existe) | Sim — é a memória |
| **Agentes** (`.claude/agents/*.md`) | Responsáveis exclusivos por um assunto; rodam em contexto separado | **Não** (cada execução começa do zero) — por isso leem e escrevem nos arquivos de estado |
| **Skills** (`.claude/skills/*/SKILL.md`) | Procedimentos reutilizáveis chamados pelos agentes ou pelo dono | Não |
| **AGENTS.md** | Princípios que valem sempre + ponteiros | Já existe; só ganha ponteiros, **nada é removido** |

**Quem orquestra é o agente principal (eu).** Fluxo padrão: planejar → dono aprova ("ok, aplique") → executar uma tarefa → verificar → revisar → registrar.

### Agentes (exclusivos)
| Agente | Responsabilidade única | Arquivos de estado (onde lê e escreve) |
|---|---|---|
| **google-ads** | Contestação e campanha do Google Ads | `docs/google-ads-contestacao/` (STATUS, AVALIACAO, RASCUNHOS, ENVIADA, EVIDENCIAS) — **não mover nada** |
| **pagamentos** | Asaas, webhook, chave, incidentes | `docs/agentes/pagamentos/` + tabela `payment_health_status` |
| **seguranca** | Permissões, segredos, exposição de dados | `docs/agentes/seguranca/` |
| **verificador** | Prova independente de que "foi feito" (somente leitura) | `docs/agentes/verificador/DIARIO.md` |
| **depurador** | Diagnóstico por logs/hipóteses | `docs/agentes/depurador/DIARIO.md` |
| **revisor** | Revisão do que mudou, com critérios do projeto | `docs/agentes/revisor/DIARIO.md` |
| **planejador** | Plano, benefícios/riscos, "Espaço no back end"/"Efeito no carregamento" | `docs/agentes/planejador/DIARIO.md` |
| **trafego-e-marketing** | Plano B (Meta/WhatsApp), e-mails e cupons | `docs/PLANO-B-TRAFEGO.md` e correlatos |
| **escrivao** | Continuidade: registra, consolida e detecta contradições entre documentos | `docs/INVENTARIO-HISTORICO.md` |

### Skills (procedimentos)
`retomar` · `publicar-funcao-supabase` · `mudanca-de-banco-segura` · `fechar-tarefa` · `testar-navegador` (Playwright CLI) · `pesquisar-fonte-oficial` (confirmar na documentação oficial e separar "confirmado" de "inferência") · `registrar-entrada-externa` · `avaliar-mudanca`.
Ações com efeito real (publicar função, commit) ficam como **manuais** (`disable-model-invocation: true`).

## 4. Garantia de não perder informação
1. **Antes de criar qualquer coisa:** etiqueta no git (`antes-dos-agentes-2026-10-14`) — volta ao estado atual a qualquer momento.
2. **Somente adições:** arquivos novos; `AGENTS.md` e docs existentes não são reescritos nem enxugados. Conferência final: `git diff --stat` com 0 linhas removidas.
3. **Inventário histórico** (`docs/INVENTARIO-HISTORICO.md`): os 257 commits agrupados por área, cruzados com `DECISOES`/`db-changes`/`PENDENCIAS`, com a lista de **lacunas** (coisas feitas que não estão descritas em nenhum documento). Revisado pelo dono antes de seguir.
4. **Cada agente tem `ESTADO` + `DIARIO` (só acrescenta, nunca apaga).** Ao começar: ler o estado e as últimas entradas do diário. Ao terminar: acrescentar o que aprendeu, decidiu e fez, com data e fonte.
5. **Entrada externa primeiro em texto bruto:** tudo que o dono colar (resposta do Google, e-mail, print) é salvo **literalmente** em `ENTRADAS/AAAA-MM-DD-hhmm.md` antes de qualquer interpretação.
6. **Sempre `git pull` antes** (várias conversas e máquinas escrevem no repositório) e escrever em arquivos próprios para evitar conflito.
7. **Auditoria de contradições** pelo escrivão (ver seção 7).

## 5. Roteiro do agente `google-ads` ao receber um retorno
1. Salvar o texto bruto em `docs/google-ads-contestacao/ENTRADAS/`.
2. Classificar: aprovada / recusada / pedido de informação / motivo novo.
3. Atualizar o painel `STATUS.md` (quadro e histórico), `DECISOES.md` e `PENDENCIAS.md`.
4. Rodar a varredura do site (`docs/VARREDURA-2026-10-13.md`, comandos do STATUS) e reverificar ao vivo.
5. **Aprovada:** checklist pós-reativação já documentado (desligar expansão do URL final, negativar fitness/academia/legging/treino/receita/grátis/usado, 2 títulos curtos, 4 imagens, vídeo, sinais de público; medir por `utm_campaign`).
6. **Recusada:** não reenviar sem **fato novo** (decisão de 13/10); listar fatos novos possíveis e as fontes a consultar (políticas oficiais do Google, RDAP, Search Console, Merchant Center, DNS).
7. Preparar rascunho, **nunca enviar**; nunca criar conta nova; nunca afirmar algo não verificado (seção "Pontos de honestidade" do STATUS).
8. Resumo curto ao dono: o que mudou, o que falta, o que depende dele.
**Limites reais:** agentes não rodam sozinhos (só quando invocados ou por lembrete agendado, que depende do app aberto); não leem o e-mail nem os painéis do Google — o dono cola o conteúdo.

## 6. Fases e critérios de aceite
- **Fase 0 (antes de tudo):** etiqueta no git + inventário histórico + lista de lacunas. *Aceite:* dono confirma que nada importante faltou.
- **Fase 1:** `escrivao`, `google-ads`, `verificador`, `depurador` + skills `retomar`, `registrar-entrada-externa`, `testar-navegador`. *Aceite:* cada um é testado em **caso real que já aconteceu** (Cloudflare 10 dias sem publicar; erro 401 da Asaas; o `/atacado` 404) e deve pegar o erro.
- **Fase 2:** `pagamentos`, `seguranca`, `revisor`, `planejador`, `trafego-e-marketing` + skills de publicação/banco/fechamento.
- **Duas semanas de uso:** contar disparos errados; cortar o que não ajudou. Limite: no máximo ~10 agentes e ~10 skills.
- **Impacto no site:** nenhum. Espaço no back end: 0. Efeito no carregamento: nenhum (arquivos de texto fora do que o site publica). Para o Lovable não instalar nada, testes ficam em pasta separada com `package.json` próprio.

## 7. Evidência de que a deriva já acontece (achada em 14/10/2026)
- `docs/PENDENCIAS.md`: linha "alna.sale/atacado continua 404" **contradiz** a linha "FEITO 13/10" do mesmo arquivo (a página própria foi criada em 13/10).
- `PENDENCIAS.md` ainda diz "2ª contestação enviada… aguardando" e "3ª em análise" enquanto `DECISOES.md` e o commit e4b2f8a registram que a **3ª foi recusada** e que se decidiu parar de reenviar (lembrete reprogramado para 20/10).
- A memória deste assistente também estava desatualizada (404 do `/atacado`, "2ª não enviada"). Corrigida em 14/10.
Conclusão: o risco de esquecer não é só de conversa para conversa, é de arquivo para arquivo. O `escrivao` existe para isso.

## 8. Decisões pendentes do dono
1. Aprovar a arquitetura (agentes + skills + continuidade) e começar pela **Fase 0**.
2. Autorizar a etiqueta no git e o arquivo `INVENTARIO-HISTORICO.md`.
3. Como deve ser o **espelho no Drive** (o procedimento citado no `AGENTS.md` não está registrado; fica fora até ser definido).
4. Manter ou apagar `C:\Users\Pichau\pw-eval` (Node portátil + Playwright CLI de teste).
