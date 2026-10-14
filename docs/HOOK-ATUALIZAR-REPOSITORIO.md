# Hook + skill: atualização automática do repositório e presença entre computadores — v2 (14/10/2026)

**Problema:** várias conversas e dois computadores escrevem neste repositório, e o assistente chegou a afirmar coisas velhas (ex.: "`alna.sale/atacado` dá 404", "2ª contestação não enviada") quando o GitHub já dizia outra coisa. Pedido do dono: "sempre que der um comando, se atualize com o repositório" e, com dois computadores, "esteja sempre atualizado entre os chats".
**Como instalar em outro computador:** `docs/PASSO-A-PASSO-OUTRO-COMPUTADOR.md`. **Mestre dos arquivos:** pasta do Drive `…\Site da AlnaCommerce\.claude\instalar\` (script, skill, instalador, LEIA-ME). Abaixo ficam cópias de segurança.

## Por que hook + skill (e não só skill)
Confirmado na documentação oficial (hooks): uma skill só é carregada quando o pedido combina com a descrição, **sem garantia de rodar a cada mensagem**. O evento `UserPromptSubmit` dispara **a cada mensagem** e o que o script imprime entra no contexto. O **hook atualiza**; a **skill** diz o que fazer com o resultado.

## O que o hook faz (a cada comando, só no projeto ALNA)
1. Ignora se o `cwd` não contiver `AlnaCommerce` ou `site-alna`.
2. Identifica o computador (`COMPUTERNAME` + nome amigável de `.claude\computadores.json`).
3. `git fetch` (no máx. 1 vez a cada 45 s; sem pedir senha; rede travada aborta em ~10 s).
4. Atrasado, **limpo e sem commit local** → `git merge --ff-only`. Ruído de CRLF em `src/routeTree.gen.ts` só é descartado se `git diff --ignore-space-at-eol` provar que não há mudança real.
5. Lê os **bilhetes de presença** do outro computador (pasta `.claude\presenca\` no Drive) e avisa: "OUTRO COMPUTADOR ATIVO: …" quando ele falou depois da última vez daqui; destaca **trabalho não enviado ao GitHub lá**; avisa uso simultâneo (menos de 15 min); pede nome se este computador não tiver.
6. Grava o próprio bilhete (data UTC, nome, HEAD, branch, commits não enviados, alterações locais, cwd) — **nunca o texto das mensagens**.
7. Injeta o bloco `[REPO ALNA | <computador>] …`. **Nunca bloqueia** (`exit 0`), nunca força, nunca apaga alteração do dono, nunca `reset`/`stash`/`pull --force`.
Latência medida: ~1,5 s com rede; ~0,8 s nas mensagens seguidas.

## Segurança
- O script roda a partir de `%USERPROFILE%\.claude\hooks\` (fora do repositório): um commit no GitHub não altera código que roda a cada mensagem. O instalador **copia** o script (não executa direto do Drive).
- O Drive guarda só bilhetes (sem conteúdo de conversa) e nomes de computadores. Não há segredos.

## Testes (14/10/2026; cópia descartável do repositório e dois computadores simulados; nada gravado na pasta real)
| Cenário | Resultado |
|---|---|
| 3 commits atrás, limpo | puxa e lista — ok |
| em dia | uma linha — ok |
| atrasado com arquivo alterado, ou com commit local | avisa, não puxa — ok |
| ruído CRLF + atrasado | puxa — ok |
| cwd de outro projeto | sem saída — ok |
| GitHub inacessível, ou repositório inexistente | aviso — ok |
| HOME fala pela 1ª vez | só "em dia" — ok |
| outro PC fala pela 1ª vez | avisa que o HOME esteve ativo, traz a frase de continuidade e pede nome — ok |
| HOME volta depois do outro | avisa — ok |
| HOME fala de novo em seguida | não repete o aviso — ok |
| outro PC com trabalho não salvo | HOME recebe "ATENCAO … NAO esta aqui" — ok |
| outro PC nomeado | usa o nome amigável — ok |
| instalador rodado no Computador HOME | settings preservado + backup, nome registrado, autoteste ok |

## Cópia do script (`atualizar-alna.ps1`, v2)
```powershell
# Hook UserPromptSubmit (v2): a cada comando, confere e atualiza o repositorio da loja ALNA, identifica QUAL computador
# esta falando e avisa o Claude do que mudou, inclusive se o outro computador trabalhou depois da ultima vez daqui.
# Regras: nunca bloqueia o comando (sempre exit 0); nunca forca nada (so fast-forward); nunca mexe se houver
# alteracao local ou commit nao enviado; so age quando o cwd e do projeto ALNA. Nao grava o conteudo das mensagens.
# Texto sem acentos de proposito (PowerShell 5.1 le arquivo sem BOM como ANSI); o JSON de saida escapa acentos.
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
$thisPc = if ($env:ALNA_COMPUTER) { $env:ALNA_COMPUTER } else { $env:COMPUTERNAME }

function Emit([string]$text) {
  $obj = @{ hookSpecificOutput = @{ hookEventName = 'UserPromptSubmit'; additionalContext = $text } }
  $json = $obj | ConvertTo-Json -Compress -Depth 4
  $json = [regex]::Replace($json, '[^\x00-\x7F]', { param($m) ('\u{0:x4}' -f [int][char]$m.Value) })
  [Console]::Out.Write($json)
}
function Log([string]$msg) {
  try {
    Add-Content -Path $logFile -Value ("{0} [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $thisPc, $msg)
    $lines = Get-Content $logFile -ErrorAction SilentlyContinue
    if ($lines -and $lines.Count -gt 300) { $lines | Select-Object -Last 150 | Set-Content $logFile }
  } catch {}
}
function G { & git -C $script:repo @args 2>$null }
function Find-DriveProject([string]$start) {
  $p = $start
  while ($p) {
    if ((Split-Path $p -Leaf) -ieq 'Site da AlnaCommerce') { return $p }
    $parent = Split-Path $p -Parent
    if (-not $parent -or $parent -eq $p) { break }
    $p = $parent
  }
  return $null
}

try {
  $raw = [Console]::In.ReadToEnd()
  $cwd = ''
  try { $cwd = (ConvertFrom-Json $raw).cwd } catch {}
  # So age no projeto ALNA (as configuracoes do usuario valem para todos os projetos).
  if ($cwd -notmatch 'AlnaCommerce|site-alna') { exit 0 }

  # Pasta compartilhada pelo Google Drive (a mesma nos dois computadores): bilhetes de presenca e nomes dos computadores.
  $proj = Find-DriveProject $cwd
  if ($env:ALNA_PRESENCE_DIR) { $presDir = $env:ALNA_PRESENCE_DIR; $namesFile = Join-Path $env:ALNA_PRESENCE_DIR 'computadores.json' }
  elseif ($proj) { $presDir = Join-Path $proj '.claude\presenca'; $namesFile = Join-Path $proj '.claude\computadores.json' }
  else { $presDir = Join-Path $hooksDir 'presenca'; $namesFile = Join-Path $hooksDir 'computadores.json' }

  function Friendly([string]$pc) {
    try {
      $m = Get-Content -LiteralPath $namesFile -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json
      $prop = $m.PSObject.Properties[$pc]
      if ($prop -and $prop.Value) { return [string]$prop.Value }
    } catch {}
    return $null
  }
  $thisName = Friendly $thisPc
  $unnamed = $false
  if (-not $thisName) { $thisName = "Computador SEM NOME ($thisPc)"; $unnamed = $true }

  $script:repo = if ($env:ALNA_REPO) { $env:ALNA_REPO } else { Join-Path $env:USERPROFILE 'dev\site-alna' }
  if (-not (Test-Path (Join-Path $script:repo '.git'))) {
    Emit "[REPO ALNA | $thisName] ATENCAO: repositorio nao encontrado em $($script:repo). Nao foi possivel conferir se esta atualizado; nao afirme o estado do projeto sem antes resolver isso."
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
    $text = "ATENCAO: falha ao consultar o GitHub (sem rede ou sem acesso). Este computador esta em $head ($headDate), mas PODE ESTAR DESATUALIZADO; avise o dono e nao afirme o estado atual do projeto como definitivo."
    Log "fetch falhou"
  }
  elseif ($behind -gt 0 -and $ahead -eq 0 -and -not $dirty) {
    $old = (G rev-parse HEAD | Select-Object -First 1)
    G merge --ff-only $upstream | Out-Null
    if ($LASTEXITCODE -ne 0) {
      $text = "ATENCAO: ha $behind commit(s) novo(s) no GitHub mas o fast-forward falhou. Nada foi alterado. Resolva antes de afirmar o estado do projeto."
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
      $text = "ATUALIZADO AGORA: $behind commit(s) novo(s) ($oldShort -> $newShort). Mais recentes:`n" + ($log -join "`n")
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
    $text = "ATENCAO: o GitHub tem $behind commit(s) novo(s) que NAO foram puxados porque " + ($why -join ' e ') + ". Nada foi alterado. Resolva (commit/push ou descarte consciente) e rode git pull antes de afirmar o estado do projeto."
    Log "nao puxou behind=$behind dirty=$dirty ahead=$ahead"
  }
  else {
    $text = "em dia com $upstream (HEAD $head, $headDate)."
    if ($dirty) { $text += " Ha alteracoes locais nao salvas: " + ((($porcelain | Select-Object -First 6) -join '; ')) + '.' }
    if ($ahead -gt 0) { $text += " Ha $ahead commit(s) local(is) ainda nao enviado(s) ao GitHub." }
    if ($skipFetch) { $text += ' (rede consultada ha menos de 45 s)' }
  }
  if ($notes.Count) { $text += ' [' + ($notes -join '; ') + ']' }

  # --- Presenca entre computadores (bilhetes na pasta do Drive; nenhum conteudo de mensagem e gravado) ---
  try {
    New-Item -ItemType Directory -Force -Path $presDir | Out-Null
    $safePc = ($thisPc -replace '[^A-Za-z0-9_\-]', '_')
    $myFile = Join-Path $presDir "presenca-$safePc.json"
    $myPrev = $null
    if (Test-Path -LiteralPath $myFile) { try { $myPrev = [datetime]::Parse((Get-Content -LiteralPath $myFile -Raw -Encoding UTF8 | ConvertFrom-Json).ultimaMensagemUtc, $null, [System.Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime() } catch {} }
    $nowUtc = (Get-Date).ToUniversalTime()

    foreach ($f in @(Get-ChildItem -LiteralPath $presDir -Filter 'presenca-*.json' -ErrorAction SilentlyContinue)) {
      if ($f.FullName -eq $myFile) { continue }
      try {
        $o = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
        $t = [datetime]::Parse($o.ultimaMensagemUtc, $null, [System.Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()
        if ($myPrev -and $t -le $myPrev) { continue }
        $otherName = Friendly ([string]$o.computador)
        if (-not $otherName) { $otherName = "outro computador sem nome ($($o.computador))" }
        $when = $t.ToLocalTime().ToString('dd/MM HH:mm')
        $text += "`nOUTRO COMPUTADOR ATIVO: $otherName teve a ultima mensagem em $when (HEAD la: $($o.head))."
        if (([int]$o.alteracoesLocais -gt 0) -or ([int]$o.commitsNaoEnviados -gt 0)) {
          $text += "`nATENCAO: la havia $([int]$o.alteracoesLocais) alteracao(oes) local(is) nao salva(s) e $([int]$o.commitsNaoEnviados) commit(s) nao enviado(s) ao GitHub: isso NAO esta aqui. Peca ao dono para enviar de la (commit e push) antes de continuar o mesmo trabalho."
        }
        if (($nowUtc - $t).TotalMinutes -lt 15) { $text += "`nPossivel uso simultaneo: o outro computador falou ha menos de 15 minutos; cuidado com edicao do mesmo arquivo." }
        $text += "`nSe o comando do dono continua um trabalho iniciado em $otherName, diga logo no INICIO da resposta: 'Estou vendo que comecamos isso no $otherName e agora vamos continuar aqui ($thisName)'; leia docs/SESSOES.md e os commits novos antes de seguir."
        Log "outro computador ativo: $($o.computador) em $when"
      } catch {}
    }
    if ($unnamed) { $text += "`nESTE COMPUTADOR AINDA NAO TEM NOME (nome tecnico: $thisPc). Pergunte ao dono como chama-lo (ex.: 'Computador TRABALHO') e registre em $namesFile como {`"$thisPc`": `"nome`"} (preserve as outras entradas)." }

    $pres = [ordered]@{
      computador = $thisPc; nome = $thisName; ultimaMensagemUtc = $nowUtc.ToString('o')
      head = $head; branch = $branch; commitsNaoEnviados = $ahead; alteracoesLocais = $porcelain.Count; cwd = $cwd
    }
    [IO.File]::WriteAllText($myFile, ($pres | ConvertTo-Json), (New-Object System.Text.UTF8Encoding $false))
  } catch { Log ("presenca falhou: " + $_.Exception.Message) }

  Emit ("[REPO ALNA | $thisName] " + $text)
}
catch {
  try { Emit "[REPO ALNA | $thisPc] ATENCAO: o hook de atualizacao falhou ($($_.Exception.Message)). Nao foi possivel conferir se o repositorio esta atualizado." } catch {}
  Log ("erro: " + $_.Exception.Message)
}
exit 0
```

## Cópia do instalador (`instalar-no-computador.ps1`)
```powershell
# Instalador do hook "atualizar o repositorio a cada comando" + skill, para QUALQUER computador do dono.
# Uso (PowerShell):  powershell -NoProfile -ExecutionPolicy Bypass -File "<pasta do projeto no Drive>\.claude\instalar\instalar-no-computador.ps1" -Nome "Computador HOME"
# - Copia o script e a skill para a pasta do Claude DESTE computador (nao executa nada direto do Drive depois).
# - Acrescenta o hook em %USERPROFILE%\.claude\settings.json SEM apagar o que ja existe (faz copia de seguranca antes).
# - Registra o nome amigavel deste computador no arquivo compartilhado .claude\computadores.json (pasta do Drive).
# - Roda um autoteste e mostra o resultado. Pode ser executado de novo sem problema (nao duplica nada).
param([string]$Nome = '')
$ErrorActionPreference = 'Stop'
$here      = $PSScriptRoot
$claudeDir = Split-Path $here -Parent            # ...\Site da AlnaCommerce\.claude  (compartilhada pelo Drive)
$projDir   = Split-Path $claudeDir -Parent       # ...\Site da AlnaCommerce
$uh        = $env:USERPROFILE
$utf8 = New-Object System.Text.UTF8Encoding $false

Write-Host "== Instalando no computador: $env:COMPUTERNAME =="
try { $gv = (& git --version) } catch { $gv = $null }
if (-not $gv) { throw 'Git nao encontrado neste computador. Instale o Git for Windows e rode de novo.' }
Write-Host "Git: $gv"
$repo = Join-Path $uh 'dev\site-alna'
if (-not (Test-Path (Join-Path $repo '.git'))) { Write-Host "ATENCAO: repositorio nao encontrado em $repo. O hook vai avisar isso a cada comando ate o repositorio existir (git clone https://github.com/alnacommerce-afk/site-alna.git no caminho acima)." }

# 1) Script do hook
$hooksDir = Join-Path $uh '.claude\hooks'
New-Item -ItemType Directory -Force -Path $hooksDir | Out-Null
Copy-Item -LiteralPath (Join-Path $here 'atualizar-alna.ps1') -Destination (Join-Path $hooksDir 'atualizar-alna.ps1') -Force
Write-Host "Script copiado para $hooksDir"

# 2) Skill
$skillDir = Join-Path $uh '.claude\skills\atualizar-com-repositorio'
New-Item -ItemType Directory -Force -Path $skillDir | Out-Null
Copy-Item -LiteralPath (Join-Path $here 'SKILL.md') -Destination (Join-Path $skillDir 'SKILL.md') -Force
Write-Host "Skill copiada para $skillDir"

# 3) settings.json (mescla sem apagar nada)
$settingsPath = Join-Path $uh '.claude\settings.json'
$cmd = '& powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.claude\hooks\atualizar-alna.ps1"'
if (Test-Path -LiteralPath $settingsPath) {
  Copy-Item -LiteralPath $settingsPath -Destination ($settingsPath + '.bak-' + (Get-Date -Format 'yyyyMMdd-HHmmss')) -Force
  $s = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json
} else { $s = [pscustomobject]@{} }
if (-not $s.PSObject.Properties['hooks']) { $s | Add-Member -NotePropertyName hooks -NotePropertyValue ([pscustomobject]@{}) }
if (-not $s.hooks.PSObject.Properties['UserPromptSubmit']) { $s.hooks | Add-Member -NotePropertyName UserPromptSubmit -NotePropertyValue @() }
$already = $false
foreach ($g in @($s.hooks.UserPromptSubmit)) { foreach ($h in @($g.hooks)) { if ($h.command -match 'atualizar-alna\.ps1') { $already = $true } } }
if ($already) { Write-Host 'Hook ja estava ligado em settings.json (nada a fazer).' }
else {
  $entry = [pscustomobject]@{ hooks = @([pscustomobject]@{ type = 'command'; shell = 'powershell'; command = $cmd; timeout = 25 }) }
  $s.hooks.UserPromptSubmit = @($s.hooks.UserPromptSubmit) + $entry
  [IO.File]::WriteAllText($settingsPath, ($s | ConvertTo-Json -Depth 20), $utf8)
  Write-Host 'Hook ligado em settings.json (copia de seguranca: settings.json.bak-...).'
}
$null = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json   # valida o JSON final

# 4) Nome amigavel deste computador (arquivo compartilhado)
$namesFile = Join-Path $claudeDir 'computadores.json'
$names = [ordered]@{}
if (Test-Path -LiteralPath $namesFile) { try { $o = Get-Content -LiteralPath $namesFile -Raw -Encoding UTF8 | ConvertFrom-Json; foreach ($p in $o.PSObject.Properties) { $names[$p.Name] = [string]$p.Value } } catch {} }
if ($Nome) {
  $names[$env:COMPUTERNAME] = $Nome
  [IO.File]::WriteAllText($namesFile, ($names | ConvertTo-Json), $utf8)
  Write-Host "Nome registrado: $env:COMPUTERNAME = $Nome"
} elseif ($names.Contains($env:COMPUTERNAME)) { Write-Host "Este computador ja se chama: $($names[$env:COMPUTERNAME])" }
else { Write-Host "Este computador AINDA NAO TEM NOME. Rode de novo com -Nome ""Computador XXX"" ou peca ao Claude para registrar." }

# 5) Autoteste
$in = (@{ cwd = $projDir } | ConvertTo-Json -Compress)
$out = $in | powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $hooksDir 'atualizar-alna.ps1')
Write-Host ''
Write-Host '== Autoteste (o que o Claude vai receber a cada comando) =='
try { Write-Host (($out | ConvertFrom-Json).hookSpecificOutput.additionalContext) } catch { Write-Host "FALHOU: $out" }
Write-Host ''
Write-Host 'PRONTO. Abra uma conversa NOVA neste computador (ou envie uma mensagem) para o hook passar a valer.'
```

## Cópia da skill (`SKILL.md`)
````markdown
---
name: atualizar-com-repositorio
description: Garante que nada sobre a loja ALNA seja afirmado com informacao velha e que os DOIS computadores do dono (Computador HOME e o outro) fiquem alinhados. Use quando aparecer o bloco "[REPO ALNA | <computador>]" no contexto (hook que atualiza o repositorio a cada comando), quando o dono disser "retome", "se atualize com o repositorio", "onde paramos" ou "vou continuar no outro computador", e antes de afirmar o estado de qualquer assunto do projeto (Google Ads, pagamentos, pendencias, decisoes).
---

# Atualizar com o repositório e entre computadores (ALNA)

**Responsabilidade única:** nunca afirmar o estado do projeto com base em memória, resumo de conversa ou cópia velha, e nunca deixar um computador sem saber o que o outro fez. O repositório (`%USERPROFILE%\dev\site-alna`, GitHub) é a fonte de verdade.

## Os computadores do dono
- **Computador HOME** (`PICHAUP-JOBNERU`): tudo que foi conversado até 14/10/2026 no chat do projeto foi feito por ele.
- O outro computador é identificado pelo hook (nome técnico + nome amigável em `.claude\computadores.json`, pasta do Drive, igual nos dois).
- O dono usa **um chat por computador**, sempre a mesma pasta do Google Drive. As conversas **não se enxergam**: o que as liga é o GitHub, o diário `docs/SESSOES.md` e os bilhetes de presença do hook.

## Como funciona
Um hook (`UserPromptSubmit`) roda a cada comando: `git fetch`, fast-forward seguro, e injeta um bloco `[REPO ALNA | <este computador>]`. Ele também lê os bilhetes de presença (pasta `.claude\presenca\` do Drive; só data, computador, HEAD e contagem de trabalho não salvo; **nunca o texto das mensagens**) e avisa quando o outro computador falou depois da última vez daqui.

## Quando NÃO usar
- Em outros projetos (o hook já ignora).
- Protocolo completo (passo 5) a cada mensagem: só em sessão nova, "retome" ou quando o bloco mostrar mudança relevante.

## Passos ao ler o bloco
1. **"em dia"** → siga com o pedido. Se houver "alteracoes locais" ou "commit(s) local(is) nao enviado(s)", diga ao dono em uma linha.
2. **"ATUALIZADO AGORA"** → antes de responder, leia os documentos listados que tenham relação com o pedido. Se algum commit novo contradiz algo que você afirmou antes, corrija em uma linha: "Atualização: …".
3. **"ATENCAO"** (não puxou, falha de rede, repositório ausente, hook falhou) → avise o dono com as palavras do bloco e **não afirme** o estado como definitivo. Para alteração local ou commit não enviado: pergunte antes de qualquer descarte; nunca use `reset --hard`, `stash` ou `pull --force` por conta própria.
4. **Sem bloco** (e o cwd é do projeto) → o hook não disparou. Rode `git -C "$env:USERPROFILE\dev\site-alna" pull --ff-only`, leia o resultado e avise o dono.
5. **Sessão nova, "retome", "onde paramos"** → protocolo do `AGENTS.md`: ler `AGENTS.md`, `docs/README.md`, `docs/PENDENCIAS.md`, `docs/DECISOES.md`, `docs/SESSOES.md` (últimas entradas) e, se o assunto for Google Ads, `docs/google-ads-contestacao/STATUS.md`; `git log --oneline -20`; resumir **onde paramos**, **o que depende do dono**, **o que devo acompanhar**, **o que mudou**; perguntar "aconteceu algo externo que eu não sei?".
6. **Memória (`MEMORY.md`)**: se uma memória afirma estado que o repositório desmente, atualize na hora. (A memória é por computador e **não** sincroniza.)

## Troca de computador
- Se o bloco trouxer **"OUTRO COMPUTADOR ATIVO: <nome>"**:
  - Se o comando do dono **continua** um trabalho iniciado lá, **comece a resposta** com: *"Estou vendo que começamos isso no <nome> e agora vamos continuar aqui (<este computador>)."* Depois leia `docs/SESSOES.md` e os commits novos.
  - Se o bloco disser **"la havia N alteracao(oes) local(is) nao salva(s)… commit(s) nao enviado(s)"**: isso **não está aqui**. Diga ao dono, em destaque, para enviar de lá (commit e push) antes de continuar o mesmo trabalho.
  - Se disser **"Possivel uso simultaneo"**: avise para não editar o mesmo arquivo nos dois ao mesmo tempo.
- Se o bloco disser **"ESTE COMPUTADOR AINDA NAO TEM NOME"**: pergunte ao dono como chamá-lo e registre em `.claude\computadores.json` (pasta do Drive) como `{"NOME_TECNICO": "Computador XXX"}`, preservando as outras entradas.

## Diário entre computadores (`docs/SESSOES.md`)
Ao concluir um bloco de trabalho, e **sempre** que o dono disser que vai trocar de computador ou encerrar, acrescente (só acrescentar, nunca apagar) uma entrada: data e hora, **nome do computador**, o que foi feito, o que ficou em andamento, próximo passo, commits. Depois faça commit e push. Toda entrada identifica o computador.

## Contradição entre documentos
Já aconteceu (`PENDENCIAS.md` com "continua 404" e "FEITO" sobre o mesmo item). Não escolha em silêncio: aponte ao dono. Ordem de confiança padrão: commit mais recente e datado > `STATUS.md`/`DECISOES.md` datados > resumos em `PENDENCIAS.md` > memória do assistente.

## Onde está cada peça
- Mestre (Drive, igual nos dois computadores): `…\Site da AlnaCommerce\.claude\instalar\` (script, esta skill, instalador, LEIA-ME).
- Em cada computador: `%USERPROFILE%\.claude\hooks\atualizar-alna.ps1` (fora do repositório de propósito: um commit no GitHub não altera um código que roda a cada mensagem), log `atualizar-alna.log`, bloco `hooks` em `%USERPROFILE%\.claude\settings.json`, esta skill em `%USERPROFILE%\.claude\skills\atualizar-com-repositorio\`.
- Desligar: remover o bloco `hooks` de `settings.json` ou `"disableAllHooks": true`.
- Documentação: `docs/HOOK-ATUALIZAR-REPOSITORIO.md` e `docs/PASSO-A-PASSO-OUTRO-COMPUTADOR.md`.
````
