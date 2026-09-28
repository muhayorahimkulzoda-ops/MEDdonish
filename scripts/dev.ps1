# Start local MEDdonish stack (Docker Postgres/Redis, or bundled Postgres on Windows).
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  $pnpm = "npx --yes pnpm@10.14.0"
} else {
  $pnpm = "pnpm"
}

Copy-Item -Path .env.example -Destination .env -ErrorAction SilentlyContinue
if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
} else {
  Write-Host "Docker not found; starting bundled Postgres on 5433"
  Start-Process -FilePath "node" -ArgumentList "scripts/local-postgres.mjs" -WindowStyle Hidden
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $tcp = New-Object System.Net.Sockets.TcpClient
      $tcp.Connect("127.0.0.1", 5433)
      $tcp.Close()
      $ready = $true
      break
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  if (-not $ready) { throw "Bundled Postgres did not start on 5433" }
  Write-Host "Starting local Redis on 6379"
  Start-Process -FilePath "node" -ArgumentList "scripts/local-redis.mjs" -WindowStyle Hidden
}
Invoke-Expression "$pnpm db:migrate"
Invoke-Expression "$pnpm db:seed"
Invoke-Expression "$pnpm dev"
