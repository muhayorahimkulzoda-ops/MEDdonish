$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$OutDir = Join-Path $PSScriptRoot "artifacts"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$File = Join-Path $OutDir "meddonish-$Stamp.sql"
$Keep = 7

docker exec meddonish-postgres pg_dump -U meddonish -d meddonish --no-owner --no-privileges | Set-Content -Path $File -Encoding utf8
if (-not (Test-Path $File) -or (Get-Item $File).Length -lt 32) {
  throw "Backup failed"
}

Get-ChildItem $OutDir -Filter "meddonish-*.sql" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $Keep |
  Remove-Item -Force

Write-Output $File
