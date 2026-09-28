param(
  [Parameter(Mandatory = $true)]
  [string]$File
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path $File)) { throw "Backup file not found" }
Get-Content -Raw $File | docker exec -i meddonish-postgres psql -U meddonish -d meddonish
Write-Output "restored"
