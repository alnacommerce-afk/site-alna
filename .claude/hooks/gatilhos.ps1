# Gatilhos do gerente (projeto ALNA). So LEMBRAM o Claude de acionar um funcionario; nunca executam nada.
# Evento Prompt: UserPromptSubmit (le o campo "prompt" do JSON recebido).
# Evento Commit: PostToolUse de Bash com git commit/push.
# Sempre sai com codigo 0. Registra em %USERPROFILE%\.claude\hooks\gatilhos.log o nome dos campos recebidos,
# para conferir se o campo "prompt" existe nesta versao do Claude Code.
param([string]$Evento = 'Prompt')
$ErrorActionPreference = 'SilentlyContinue'
$raw = [Console]::In.ReadToEnd()
$obj = $null
try { $obj = $raw | ConvertFrom-Json } catch {}
$logDir = Join-Path $env:USERPROFILE '.claude\hooks'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$keys = if ($obj) { ($obj.PSObject.Properties.Name -join ',') } else { '(sem json)' }
Add-Content -Path (Join-Path $logDir 'gatilhos.log') -Value ("{0} evento={1} campos={2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Evento, $keys)

function Emit([string]$msg, [string]$evName) {
  $o = @{ hookSpecificOutput = @{ hookEventName = $evName; additionalContext = $msg } }
  $j = $o | ConvertTo-Json -Compress -Depth 4; $j = [regex]::Replace($j, '[^\x00-\x7F]', { param($m) ('\u{0:x4}' -f [int][char]$m.Value) }); [Console]::Out.Write($j)
}

if ($Evento -eq 'Prompt') {
  $p = ''
  if ($obj -and $obj.prompt) { $p = [string]$obj.prompt }
  $msgs = @()
  if ($p -match '(?i)google ads|\bads\b|contesta|suspens|635-244|campanha do google') {
    $msgs += '[GERENTE] O pedido toca o Google Ads: siga a tabela de roteamento e acione o Juridico. Nada e enviado sem o seu ok.'
  }
  if ($p -match '(?i)publiquei|confere|subiu|est[aa] no ar') {
    $msgs += '[GERENTE] Pedido de verificacao de publicacao: acione a Auditoria (so leitura, ao vivo). Se achar algo errado, apresente o plano e espere o seu ok.'
  }
  if ($msgs.Count -gt 0) { Emit ($msgs -join ' ') 'UserPromptSubmit' }
}
elseif ($Evento -eq 'Commit') {
  Emit '[GERENTE] Houve commit ou push: acione a Memoria do Backoffice para registrar o bloco no diario (docs/SESSOES.md). Registre no proximo commit; nao crie commit so para registrar.' 'PostToolUse'
}
exit 0
