$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$reverbNodeDirectory = Split-Path (Get-Command node).Source
$reverbNpx = Join-Path $reverbNodeDirectory 'node_modules/npm/bin/npx-cli.js'
$raw = & node $reverbNpx --yes supabase@2.120.0 status --output json
if ($LASTEXITCODE -ne 0) { throw 'Démarrer Supabase avant de configurer les variables.' }
$status = $raw | ConvertFrom-Json
if (-not $status.API_URL -or -not $status.ANON_KEY -or -not $status.SERVICE_ROLE_KEY) { throw 'Réponse Supabase incomplète.' }
if ($status.API_URL -notmatch '^http://(127\.0\.0\.1|localhost):54321$') { throw 'Ce script configure uniquement la stack locale.' }
$rootConfig = "SUPABASE_URL=$($status.API_URL)`nSUPABASE_ANON_KEY=$($status.ANON_KEY)`nSUPABASE_SERVICE_ROLE_KEY=$($status.SERVICE_ROLE_KEY)`nAPP_ORIGIN=http://localhost:8081`n"
$clientConfig = "EXPO_PUBLIC_SUPABASE_URL=$($status.API_URL)`nEXPO_PUBLIC_SUPABASE_ANON_KEY=$($status.ANON_KEY)`nEXPO_PUBLIC_API_URL=http://127.0.0.1:8787`n"
[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env.local'), $rootConfig)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'apps/client/.env.local'), $clientConfig)
Write-Output 'Configuration locale écrite dans les fichiers exclus de Git. Aucune clé affichée.'
