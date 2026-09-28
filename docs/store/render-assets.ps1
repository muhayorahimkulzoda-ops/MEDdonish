$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = 'C:\Users\X-BIT2026\Desktop\MEDinstitut'
$assets = Join-Path $root 'docs\store\assets'
$web = Join-Path $root 'apps\web\public\store'
New-Item -ItemType Directory -Force -Path $assets, $web | Out-Null

function Save-BrandPng([int]$Width, [int]$Height, [string]$Path, [string]$Mode) {
  $bmp = New-Object System.Drawing.Bitmap $Width, $Height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  $brand = [System.Drawing.Color]::FromArgb(22, 50, 92)
  $accent = [System.Drawing.Color]::FromArgb(200, 29, 37)
  $paper = [System.Drawing.Color]::FromArgb(246, 248, 251)
  $muted = [System.Drawing.Color]::FromArgb(91, 107, 124)
  $g.Clear($paper)
  if ($Mode -eq 'icon') {
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $brand), 0, 0, $Width, $Height)
    $bar = [Math]::Max(8, [int]($Height * 0.08))
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $accent), 0, ($Height - $bar), $Width, $bar)
    $font = New-Object System.Drawing.Font 'Georgia', ([Math]::Max(12, [int]($Height * 0.28))), ([System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString('M', $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, (-$bar / 4), $Width, $Height), $sf)
    $font.Dispose()
  } else {
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $brand), 0, 0, [int]($Width * 0.36), $Height)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush $accent), 0, ($Height - 18), $Width, 18)
    $title = New-Object System.Drawing.Font 'Georgia', 42, ([System.Drawing.FontStyle]::Bold)
    $sub = New-Object System.Drawing.Font 'Segoe UI', 20
    $g.DrawString('MEDdonish', $title, [System.Drawing.Brushes]::White, 28, 170)
    $ink = New-Object System.Drawing.SolidBrush $muted
    $brandBrush = New-Object System.Drawing.SolidBrush $brand
    $g.DrawString('Video  ·  Tests  ·  Clinic', $sub, $ink, [int]($Width * 0.40), 180)
    $g.DrawString('1 month    5 months    1 year', $sub, $brandBrush, [int]($Width * 0.40), 240)
    $title.Dispose(); $sub.Dispose(); $ink.Dispose(); $brandBrush.Dispose()
  }
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

Save-BrandPng 512 512 (Join-Path $assets 'icon-512.png') icon
Save-BrandPng 1024 1024 (Join-Path $assets 'icon-1024.png') icon
Save-BrandPng 1024 500 (Join-Path $assets 'feature-1024x500.png') feature
Copy-Item -Force (Join-Path $assets 'icon-512.png') (Join-Path $web 'icon-512.png')
Copy-Item -Force (Join-Path $assets 'icon-1024.png') (Join-Path $web 'icon-1024.png')
Copy-Item -Force (Join-Path $assets 'feature-1024x500.png') (Join-Path $web 'feature-1024x500.png')
if (Test-Path (Join-Path $assets 'probe.png')) { Remove-Item (Join-Path $assets 'probe.png') }
Get-ChildItem $assets | ForEach-Object { Write-Output "$($_.Name) $($_.Length)" }
