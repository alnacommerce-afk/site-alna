# Passo a passo — ligar o outro computador (criado em 14/10/2026)

**Objetivo do dono:** estar **sempre atualizado entre os chats**. Cada computador tem o seu chat do projeto; a cada comando o assistente se sincroniza com o GitHub, sabe **qual computador** está falando e, quando o dono continua um trabalho iniciado no outro, diz: *"Estou vendo que começamos isso no Computador HOME e agora vamos continuar aqui."*
**Computador HOME** = `PICHAUP-JOBNERU` (já instalado e testado em 14/10/2026). Tudo que foi conversado no chat do projeto até aqui foi feito por ele (ver `docs/SESSOES.md`).

## Antes de começar (no outro computador)
1. **Git** instalado (`git --version` no PowerShell).
2. **Repositório** em `%USERPROFILE%\dev\site-alna`. Se não existir: `git clone https://github.com/alnacommerce-afk/site-alna.git "%USERPROFILE%\dev\site-alna"`.
3. A **pasta do projeto no Google Drive** já sincronizada (é a mesma nos dois computadores; a letra do Drive pode ser diferente).

## Passo 1 — instalar (escolha um jeito)
**Jeito fácil, pelo próprio Claude do outro computador.** Abra o chat do projeto lá e cole:
> Leia o arquivo `.claude\instalar\LEIA-ME.txt` desta pasta e instale o hook de atualização neste computador. O nome deste computador é: **Computador XXX** *(troque pelo nome que quiser)*

O Claude roda o instalador e mostra o autoteste; aprove quando ele pedir permissão.

**Jeito manual (PowerShell):**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "<PASTA DO PROJETO NO DRIVE>\.claude\instalar\instalar-no-computador.ps1" -Nome "Computador XXX"
```

O que o instalador faz (e só isso): copia o script para `%USERPROFILE%\.claude\hooks\`, copia a skill para `%USERPROFILE%\.claude\skills\atualizar-com-repositorio\`, **acrescenta** o hook em `%USERPROFILE%\.claude\settings.json` **sem apagar nada** (cópia de segurança `settings.json.bak-DATA`), registra o nome em `.claude\computadores.json` (pasta do Drive, compartilhado) e roda um autoteste. Pode ser repetido sem duplicar nada.

## Passo 2 — conferir
Abra uma conversa **nova** (ou envie uma mensagem). A primeira resposta deve vir sabendo "[REPO ALNA | Computador XXX]" e, se o HOME já tiver falado, "OUTRO COMPUTADOR ATIVO: Computador HOME…". Se o assistente não mencionar nada, pergunte: "o hook de atualização rodou?".

## Passo 3 — teste de continuidade (2 minutos)
1. No **HOME**, peça algo pequeno (ex.: "anote em SESSOES.md que testamos a troca de computador") e peça para ele fazer commit e push.
2. No **outro computador**, diga: "continue o que estávamos fazendo". Esperado: o assistente puxa o GitHub sozinho e começa dizendo que o trabalho foi iniciado no Computador HOME.

## Regras do dia a dia
1. **Antes de trocar de computador**, diga: "vou continuar no outro computador". O assistente registra em `docs/SESSOES.md`, faz commit e push.
2. **Trabalho que ficou só no disco (sem commit/push) não existe no outro computador.** O hook avisa quando vê isso (alterações não salvas ou commits não enviados no outro).
3. Evite editar o **mesmo arquivo** nos dois ao mesmo tempo (o hook avisa quando o outro falou há menos de 15 min).
4. O Google Drive leva de alguns segundos a poucos minutos para sincronizar os bilhetes de presença.
5. A **memória do assistente é por computador** e não sincroniza; o que vale está no GitHub (`docs/`).

## Como funciona (resumo)
- A cada comando: `git fetch`, atualização só por fast-forward e só se não houver trabalho local; bloco de contexto com o que mudou.
- Cada computador deixa um **bilhete** `.claude\presenca\presenca-<COMPUTADOR>.json` na pasta do Drive (data, nome, versão do código, contagem de trabalho não salvo; **nunca o texto das mensagens**). O outro lê e avisa.
- Nomes amigáveis em `.claude\computadores.json` (Drive). Computador sem nome aparece como "SEM NOME (<nome técnico>)" e o assistente pergunta como chamá-lo.

## Limites
- As conversas **não se enxergam**; só valem o GitHub, `docs/SESSOES.md` e os bilhetes.
- Só vale em sessões abertas numa pasta cujo caminho contenha `AlnaCommerce` ou `site-alna`.
- Se o GitHub estiver fora do ar, o aviso diz que o estado pode estar desatualizado.
- O hook **não envia** nada ao GitHub (só puxa): quem envia é o assistente, a pedido do dono ou ao registrar o diário.

## Desligar ou atualizar
Desligar: remover o bloco `hooks` de `%USERPROFILE%\.claude\settings.json` (ou `"disableAllHooks": true`). Atualizar a versão: rodar o instalador de novo.

## Problemas comuns
| Sintoma | O que fazer |
|---|---|
| Nenhum bloco `[REPO ALNA]` | Conferir se o caminho da pasta da conversa contém `AlnaCommerce`/`site-alna`; rodar `git -C "%USERPROFILE%\dev\site-alna" pull --ff-only` e avisar o assistente |
| "ESTE COMPUTADOR AINDA NAO TEM NOME" | Rodar o instalador com `-Nome` ou pedir ao assistente para registrar |
| "repositorio nao encontrado" | Fazer o `git clone` do início |
| "falha ao consultar o GitHub" | Sem internet ou sem login do Git neste computador |
