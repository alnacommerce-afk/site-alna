# Atualização automática do repositório a cada comando (hook + skill) — criado em 14/10/2026

**Problema que resolve:** várias conversas e máquinas escrevem neste repositório, e o assistente chegou a afirmar coisas velhas (ex.: "`alna.sale/atacado` dá 404", "2ª contestação não enviada") quando o GitHub já dizia outra coisa. Pedido do dono: "sempre que der um comando, se atualize com o repositório".

## Por que hook + skill (e não só skill)
Confirmado na documentação oficial do Claude Code (hooks): uma skill só é carregada quando o pedido combina com a descrição; **não há garantia de rodar a cada mensagem**. O evento `UserPromptSubmit` dispara **a cada mensagem**, e o que o script imprime entra no contexto do assistente. Por isso: o **hook faz a atualização** e a **skill diz o que fazer com o resultado**.

## O que o hook faz (a cada comando, só no projeto ALNA)
1. Lê o `cwd` da sessão; se não contiver `AlnaCommerce` ou `site-alna`, **não faz nada** (as configurações de usuário valem para todos os projetos).
2. `git fetch` (no máximo 1 vez a cada 45 s; sem pedir senha; aborta rede travada em ~10 s).
3. Se está atrasado e **limpo e sem commit local**: `git merge --ff-only origin/<branch>` (só fast-forward).
4. Descarta **somente** o ruído de fim de linha (CRLF) em `src/routeTree.gen.ts`, e só quando `git diff --ignore-space-at-eol` prova que não há mudança real.
5. Injeta no contexto um bloco `[REPO ALNA]`: "em dia", ou "ATUALIZADO AGORA" com os commits novos, documentos/funções/site alterados, ou "ATENCAO" (alteração local, commit não enviado, falha de rede, repositório ausente, erro do hook).
6. **Nunca bloqueia o comando** (sempre `exit 0`), nunca força, nunca apaga alteração do dono, nunca faz `reset`/`stash`/`pull --force`.
Latência medida: ~1,5 s com rede, ~0,8 s nas mensagens seguidas.

## Segurança
- O script fica **fora do repositório** (`%USERPROFILE%\.claude\hooks\`): um commit no GitHub (dono, Lovable ou qualquer um com acesso) **não consegue alterar** um código que roda a cada mensagem no computador do dono.
- Não grava nem lê segredos. O log (`atualizar-alna.log`, últimas ~150 linhas) só guarda data e resultado.

## Testes feitos (14/10/2026, em cópia descartável do repositório, sem tocar o real)
| Cenário | Resultado esperado | Resultado |
|---|---|---|
| 3 commits atrás, limpo | puxa e lista | ok |
| em dia | uma linha | ok |
| atrasado com arquivo alterado | avisa, não puxa | ok |
| ruído CRLF + atrasado | puxa | ok |
| commit local não enviado + atrasado | avisa, não puxa | ok |
| cwd de outro projeto | nenhuma saída | ok |
| GitHub inacessível | avisa "pode estar desatualizado" | ok |
| repositório inexistente | avisa | ok |

## Como ligar em outra máquina
1. Copiar o script abaixo para `%USERPROFILE%\.claude\hooks\atualizar-alna.ps1` (o repositório deve estar em `%USERPROFILE%\dev\site-alna`, ou definir a variável `ALNA_REPO`).
2. Em `%USERPROFILE%\.claude\settings.json`, dentro do objeto principal, acrescentar (sem apagar o que já existir):
```json
"hooks": {
  "UserPromptSubmit": [
    { "hooks": [ {
      "type": "command",
      "shell": "powershell",
      "command": "& powershell -NoProfile -ExecutionPolicy Bypass -File \"$env:USERPROFILE\.claude\hooks\atualizar-alna.ps1\"",
      "timeout": 25
    } ] }
  ]
}
```
3. Copiar a skill (abaixo) para `%USERPROFILE%\.claude\skills\atualizar-com-repositorio\SKILL.md`.
4. Para desligar: remover o bloco `hooks` ou usar `"disableAllHooks": true`.
Observação: o texto do script é **sem acentos de propósito** (PowerShell 5.1 lê arquivo sem BOM como ANSI).

## Limites
- Só vale para sessões abertas em pasta cujo caminho contenha `AlnaCommerce` ou `site-alna`.
- Não substitui ler os documentos: ele avisa **o que mudou**; a leitura é feita pela skill/protocolo "retomar" do `AGENTS.md`.
- Se o GitHub estiver fora do ar, o aviso diz que o estado pode estar desatualizado.

## Cópia do script (`atualizar-alna.ps1`)
```powershell
# Hook UserPromptSubmit: a cada comando, confere e atualiza o repositorio da loja ALNA e avisa o Claude do que mudou.
# Regras: nunca bloqueia o comando (sempre exit 0); nunca forca nada (so fast-forward); nunca mexe se houver
# alteracao local ou commit nao enviado; so age quando o cwd e do projeto ALNA. Texto sem acentos de proposito
# (PowerShell 5.1 le arquivo sem BOM como ANSI); o JSON de saida escapa acentos vindos do git.
$ErrorActionPreference = 'Continue'
$env:GIT_TERMINAL_PROMPT = '0'
$env:GIT_HTTP_LOW_SPEED_LIMIT = '1000'
$env:GIT_HTTP_LOW_SPEED_TIME = '10'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$hooksDir = Join-Path $env:USERPROFILE '.claude\hooks'
$logFile  = Join-Path $hooksDir 'atualizar-alna.log'
$stamp    = Join-Path $hooksDir '.alna-last-fetch'
$minGapSeconds = 45

function Emit([string]$text) {
  $obj = @{ hookSpecificOutput = @{ hookEventName = 'UserPromptSubmit'; additionalContext = $text } }
  $json = $obj | ConvertTo-Json -Compress -Depth 4
  $json = [regex]::Replace($json, '[^\x00-\x7F]', { param($m) ('\u{0:x4}' -f [int][char]$m.Value) })
  [Console]::Out.Write($json)
}
function Log([string]$msg) {
  try {
    Add-Content -Path $logFile -Value ("{0} {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg)
    $lines = Get-Content $logFile -ErrorAction SilentlyContinue
    if ($lines -and $lines.Count -gt 300) { $lines | Select-Object -Last 150 | Set-Content $logFile }
  } catch {}
}
function G { & git -C $script:repo @args 2>$null }

try {
  $raw = [Console]::In.ReadToEnd()
  $cwd = ''
  try { $cwd = (ConvertFrom-Json $raw).cwd } catch {}
  # So age no projeto ALNA (as configuracoes do usuario valem para todos os projetos).
  if ($cwd -notmatch 'AlnaCommerce|site-alna') { exit 0 }

  $script:repo = if ($env:ALNA_REPO) { $env:ALNA_REPO } else { Join-Path $env:USERPROFILE 'dev\site-alna' }
  if (-not (Test-Path (Join-Path $script:repo '.git'))) {
    Emit "[REPO ALNA] ATENCAO: repositorio nao encontrado em $($script:repo). Nao foi possivel conferir se esta atualizado; nao afirme o estado do projeto sem antes resolver isso."
    Log "repo ausente"; exit 0
  }

  $branch = (G rev-parse --abbrev-ref HEAD | Select-Object -First 1)
  $upstream = "origin/$branch"
  $notes = @()

  # Fetch, no maximo 1 vez a cada 45 s (varios comandos seguidos nao repetem a rede).
  $skipFetch = $false
  if (Test-Path $stamp) { if (((Get-Date) - (Get-Item $stamp).LastWriteTime).TotalSeconds -lt $minGapSeconds) { $skipFetch = $true } }
  $fetchOk = $true
  if (-not $skipFetch) {
    G fetch --quiet origin | Out-Null
    if ($LASTEXITCODE -ne 0) { $fetchOk = $false } else { Set-Content -Path $stamp -Value (Get-Date -Format o) }
  }

  # Ruido de fim de linha (CRLF) no arquivo gerado nunca deve travar a atualizacao.
  $porcelain = @(G status --porcelain)
  if ($porcelain.Count -eq 1 -and $porcelain[0] -match 'src/routeTree\.gen\.ts$') {
    G diff --ignore-space-at-eol --quiet -- src/routeTree.gen.ts | Out-Null
    if ($LASTEXITCODE -eq 0) { G checkout -- src/routeTree.gen.ts | Out-Null; $porcelain = @(G status --porcelain); $notes += 'ruido de CRLF em routeTree.gen.ts descartado' }
  }
  $dirty = $porcelain.Count -gt 0

  $counts = (G rev-list --left-right --count "HEAD...$upstream" | Select-Object -First 1)
  $ahead = 0; $behind = 0
  if ($counts -match '^(\d+)\s+(\d+)$') { $ahead = [int]$Matches[1]; $behind = [int]$Matches[2] }
  $head = (G rev-parse --short HEAD | Select-Object -First 1)
  $headDate = (G log -1 --format=%ad --date=format:'%d/%m %H:%M' | Select-Object -First 1)

  $text = ''
  if (-not $fetchOk) {
    $text = "[REPO ALNA] ATENCAO: falha ao consultar o GitHub (sem rede ou sem acesso). Este computador esta em $head ($headDate), mas PODE ESTAR DESATUALIZADO; avise o dono e nao afirme o estado atual do projeto como definitivo."
    Log "fetch falhou"
  }
  elseif ($behind -gt 0 -and $ahead -eq 0 -and -not $dirty) {
    $old = (G rev-parse HEAD | Select-Object -First 1)
    G merge --ff-only $upstream | Out-Null
    if ($LASTEXITCODE -ne 0) {
      $text = "[REPO ALNA] ATENCAO: ha $behind commit(s) novo(s) no GitHub mas o fast-forward falhou. Nada foi alterado. Resolva antes de afirmar o estado do projeto."
      Log "ff falhou behind=$behind"
    } else {
      $new = (G rev-parse HEAD | Select-Object -First 1)
      $newShort = (G rev-parse --short HEAD | Select-Object -First 1)
      $oldShort = $old.Substring(0, 7)
      $log = @(G log --format='%h %ad %an | %s' --date=format:'%d/%m %H:%M' "$old..$new" | Select-Object -First 12)
      $files = @(G diff --name-only $old $new)
      $docs = @($files | Where-Object { $_ -match '^(docs/|AGENTS\.md)' })
      $fn = @($files | Where-Object { $_ -match '^supabase/(functions|migrations)/' })
      $src = @($files | Where-Object { $_ -match '^(src/|home-cloudflare/)' })
      $text = "[REPO ALNA] ATUALIZADO AGORA: $behind commit(s) novo(s) ($oldShort -> $newShort). Mais recentes:`n" + ($log -join "`n")
      if ($behind -gt 12) { $text += "`n... e mais $($behind - 12) commit(s) anteriores." }
      if ($docs.Count) { $text += "`nDocumentos alterados (RELEIA antes de afirmar o estado desses assuntos): " + (($docs | Select-Object -First 20) -join ', ') }
      if ($fn.Count)   { $text += "`nSupabase (funcoes/migracoes) alterado: " + (($fn | Select-Object -First 15) -join ', ') }
      if ($src.Count)  { $text += "`nSite (src/home) alterado: $($src.Count) arquivo(s)." }
      $text += "`nO repositorio manda: sua memoria e o resumo da conversa podem estar velhos. Se algo que voce afirmou antes conflita com estes commits, corrija e avise o dono."
      Log "atualizado $oldShort -> $newShort ($behind commits)"
    }
  }
  elseif ($behind -gt 0) {
    $why = @(); if ($dirty) { $why += "ha alteracoes locais nao salvas: " + ((($porcelain | Select-Object -First 6) -join '; ')) }; if ($ahead -gt 0) { $why += "ha $ahead commit(s) local(is) nao enviado(s)" }
    $text = "[REPO ALNA] ATENCAO: o GitHub tem $behind commit(s) novo(s) que NAO foram puxados porque " + ($why -join ' e ') + ". Nada foi alterado. Resolva (commit/push ou descarte consciente) e rode git pull antes de afirmar o estado do projeto."
    Log "nao puxou behind=$behind dirty=$dirty ahead=$ahead"
  }
  else {
    $text = "[REPO ALNA] em dia com $upstream (HEAD $head, $headDate)."
    if ($dirty) { $text += " Ha alteracoes locais nao salvas: " + ((($porcelain | Select-Object -First 6) -join '; ')) + '.' }
    if ($ahead -gt 0) { $text += " Ha $ahead commit(s) local(is) ainda nao enviado(s) ao GitHub." }
    if ($skipFetch) { $text += ' (rede consultada ha menos de 45 s)' }
  }
  if ($notes.Count) { $text += ' [' + ($notes -join '; ') + ']' }
  Emit $text
}
catch {
  try { Emit "[REPO ALNA] ATENCAO: o hook de atualizacao falhou ($($_.Exception.Message)). Nao foi possivel conferir se o repositorio esta atualizado." } catch {}
  Log ("erro: " + $_.Exception.Message)
}
exit 0
```

## Cópia da skill (`SKILL.md`)
````markdown
---
name: atualizar-com-repositorio
description: Garante que nada sobre a loja ALNA seja afirmado com informacao velha. Use quando aparecer o bloco "[REPO ALNA]" no contexto (hook que atualiza o repositorio a cada comando), quando o dono disser "retome", "se atualize com o repositorio" ou "onde paramos", e antes de afirmar o estado de qualquer assunto do projeto (Google Ads, pagamentos, pendencias, decisoes).
---

# Atualizar com o repositório (ALNA)

**Responsabilidade única:** nunca afirmar o estado do projeto com base em memória, resumo de conversa ou cópia velha. O repositório (`%USERPROFILE%\dev\site-alna`, GitHub) é a fonte de verdade.

## Como funciona
Um hook (`UserPromptSubmit`) roda a cada comando do dono: faz `git fetch`, puxa só com fast-forward quando é seguro e injeta no contexto um bloco que começa com `[REPO ALNA]`. Esta skill diz o que fazer com ele.

## Quando NÃO usar
- Em conversas de outros projetos (o hook já ignora; não rode o protocolo completo por conta própria).
- A cada mensagem: o protocolo completo (passo 5) é só para sessão nova, "retome" ou quando o bloco mostrar mudança relevante.

## Passos ao ler o bloco `[REPO ALNA]`
1. **"em dia"** → siga com o pedido. Se houver "alteracoes locais" ou "commit(s) local(is) nao enviado(s)", diga ao dono em uma linha.
2. **"ATUALIZADO AGORA"** → antes de responder, leia os documentos listados que tenham relação com o pedido (`docs/PENDENCIAS.md`, `docs/DECISOES.md`, `docs/google-ads-contestacao/STATUS.md` etc.). Se algum commit novo contradiz algo que você afirmou antes (nesta conversa ou na memória), corrija em uma linha: "Atualização: …".
3. **"ATENCAO"** (não puxou, falha de rede, repositório ausente, hook falhou) → avise o dono com as palavras do bloco e **não afirme** o estado do projeto como definitivo. Para alteração local ou commit não enviado: pergunte antes de qualquer descarte; nunca use `reset --hard`, `stash` ou `pull --force` por conta própria.
4. **Sem bloco nenhum** (e o cwd é do projeto) → o hook não disparou. Rode `git -C "$env:USERPROFILE\dev\site-alna" pull --ff-only`, leia o resultado e avise o dono que o hook falhou.
5. **Sessão nova, "retome", "onde paramos"** → protocolo completo do `AGENTS.md`: ler `AGENTS.md`, `docs/README.md`, `docs/PENDENCIAS.md`, `docs/DECISOES.md` e, se o assunto for Google Ads, `docs/google-ads-contestacao/STATUS.md`; `git log --oneline -20`; responder curto com **onde paramos**, **o que depende do dono**, **o que devo acompanhar**, **o que mudou**; perguntar "aconteceu algo externo que eu não sei?".
6. **Memória (`MEMORY.md`)**: se uma memória afirma estado do projeto que o repositório desmente, atualize a memória na hora.

## Contradição entre documentos
Já aconteceu (ex.: `PENDENCIAS.md` dizendo "continua 404" e "FEITO" sobre o mesmo item). Não escolha em silêncio: aponte ao dono. Ordem de confiança padrão: commit mais recente e datado > `STATUS.md`/`DECISOES.md` datados > resumos em `PENDENCIAS.md` > memória do assistente.

## Onde está cada peça (esta máquina)
- Script: `%USERPROFILE%\.claude\hooks\atualizar-alna.ps1` (fora do repositório de propósito: um commit no GitHub não consegue alterar um script que roda a cada mensagem).
- Registro do que o hook fez: `%USERPROFILE%\.claude\hooks\atualizar-alna.log`.
- Ligação: bloco `hooks` em `%USERPROFILE%\.claude\settings.json`. Para desligar: remover o bloco ou `"disableAllHooks": true`.
- Documentação e cópia do script para outra máquina: `docs/HOOK-ATUALIZAR-REPOSITORIO.md` no repositório.
````
