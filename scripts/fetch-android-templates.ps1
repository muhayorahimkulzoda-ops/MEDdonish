# Pull only Android Godot 4.4 templates via HTTP Range (not the 1.1GB full TPZ).
$ErrorActionPreference = 'Stop'
$Tools = $env:MEDDONISH_NATIVE_TOOLS
if (-not $Tools) { $Tools = Join-Path $env:USERPROFILE 'tools\meddonish-native' }
$PageUrl = 'https://github.com/godotengine/godot/releases/download/4.4-stable/Godot_v4.4-stable_export_templates.tpz'
$Dest = Join-Path $env:APPDATA 'Godot\export_templates\4.4.stable'
$Work = Join-Path $Tools 'tpl-range'
New-Item -ItemType Directory -Force -Path $Work, $Dest | Out-Null

function Resolve-Asset {
  $effective = & curl.exe -sI -o NUL -w '%{url_effective}' -L $PageUrl
  if (-not $effective) { throw 'Could not resolve template asset URL' }
  return $effective
}

function Get-RangeBytes([string]$Url, [int64]$Start, [int64]$End, [string]$OutFile) {
  $len = $End - $Start + 1
  Write-Host "RANGE $Start-$End ($len) -> $OutFile"
  $parts = 1
  if ($len -gt 16MB) { $parts = 4 }
  if ($parts -eq 1) {
    & curl.exe -L --retry 8 --retry-all-errors --output $OutFile --range "$Start-$End" --url $Url
    if ($LASTEXITCODE -ne 0) { throw "range failed $Start-$End" }
    return (Get-Item $OutFile).Length
  }
  $jobs = @()
  $chunk = [int64][math]::Ceiling($len / $parts)
  for ($i = 0; $i -lt $parts; $i++) {
    $a = $Start + ($i * $chunk)
    $b = [Math]::Min($End, $a + $chunk - 1)
    if ($a -gt $End) { break }
    $part = "$OutFile.p$i"
    $jobs += Start-Job -ScriptBlock {
      param($U, $A, $B, $P)
      & curl.exe -L --retry 8 --retry-all-errors --output $P --range "$A-$B" --url $U
      if ($LASTEXITCODE -ne 0) { throw "range failed $A-$B" }
    } -ArgumentList $Url, $a, $b, $part
    Write-Host "  part $i $a-$b"
  }
  $jobs | Wait-Job | Out-Null
  $failed = $jobs | Where-Object { $_.State -ne 'Completed' }
  if ($failed) { throw "parallel range failed" }
  $jobs | Remove-Job
  $out = [System.IO.File]::Create($OutFile)
  try {
    for ($i = 0; $i -lt $parts; $i++) {
      $part = "$OutFile.p$i"
      $fs = [System.IO.File]::OpenRead($part)
      try { $fs.CopyTo($out) } finally { $fs.Dispose() }
    }
  } finally { $out.Dispose() }
  return (Get-Item $OutFile).Length
}

function Read-U16([byte[]]$b, [int]$o) { [BitConverter]::ToUInt16($b, $o) }
function Read-U32([byte[]]$b, [int]$o) { [BitConverter]::ToUInt32($b, $o) }

$needed = Test-Path (Join-Path $Dest 'android_source.zip')
$haveVersion = Test-Path (Join-Path $Dest 'version.txt')
if ($needed -and $haveVersion) {
  Write-Host "Android templates already installed: $Dest"
  exit 0
}

$url = Resolve-Asset
$lenFile = Join-Path $Work 'len.txt'
& curl.exe -sI -L --output $lenFile $PageUrl | Out-Null
$headers = Get-Content $lenFile
$sizeLine = $headers | Where-Object { $_ -match '^Content-Length:\s*(\d+)' } | Select-Object -Last 1
if (-not $sizeLine) { throw 'No Content-Length for templates' }
$size = [int64]([regex]::Match($sizeLine, '(\d+)').Groups[1].Value)
Write-Host "TPZ size=$size"
Write-Host "asset=$url"

$tailSize = [Math]::Min(8MB, $size)
$tailStart = $size - $tailSize
$tail = Join-Path $Work 'tail.bin'
Get-RangeBytes $url $tailStart ($size - 1) $tail | Out-Null
$tailBytes = [System.IO.File]::ReadAllBytes($tail)

$eocd = -1
for ($i = $tailBytes.Length - 22; $i -ge 0; $i--) {
  if ($tailBytes[$i] -eq 0x50 -and $tailBytes[$i+1] -eq 0x4B -and $tailBytes[$i+2] -eq 0x05 -and $tailBytes[$i+3] -eq 0x06) {
    $commentLen = Read-U16 $tailBytes ($i + 20)
    if (($i + 22 + $commentLen) -eq $tailBytes.Length) { $eocd = $i; break }
  }
}
if ($eocd -lt 0) { throw 'EOCD not found in TPZ tail' }

$cdSize = Read-U32 $tailBytes ($eocd + 12)
$cdOffset = Read-U32 $tailBytes ($eocd + 16)
$entries = Read-U16 $tailBytes ($eocd + 10)
Write-Host "ZIP entries=$entries cdOffset=$cdOffset cdSize=$cdSize"

if ($cdOffset -lt $tailStart) {
  $url = Resolve-Asset
  $cdFile = Join-Path $Work 'cd.bin'
  Get-RangeBytes $url $cdOffset ($cdOffset + $cdSize - 1) $cdFile | Out-Null
  $cd = [System.IO.File]::ReadAllBytes($cdFile)
} else {
  $cdStartInTail = [int]($cdOffset - $tailStart)
  $cd = New-Object byte[] $cdSize
  [Array]::Copy($tailBytes, $cdStartInTail, $cd, 0, $cdSize)
}

$wanted = @('android_source.zip', 'android_release.apk', 'android_debug.apk', 'version.txt')
$files = @()
$pos = 0
while ($pos + 46 -le $cd.Length) {
  if ((Read-U32 $cd $pos) -ne 0x02014B50) { break }
  $method = Read-U16 $cd ($pos + 10)
  $comp = Read-U32 $cd ($pos + 20)
  $uncomp = Read-U32 $cd ($pos + 24)
  $nameLen = Read-U16 $cd ($pos + 28)
  $extraLen = Read-U16 $cd ($pos + 30)
  $commentLen = Read-U16 $cd ($pos + 32)
  $localOff = Read-U32 $cd ($pos + 42)
  $name = [System.Text.Encoding]::UTF8.GetString($cd, $pos + 46, $nameLen)
  $base = Split-Path $name -Leaf
  if ($wanted -contains $base) {
    $files += [pscustomobject]@{
      Name = $base
      Method = $method
      Comp = [int64]$comp
      Uncomp = [int64]$uncomp
      Local = [int64]$localOff
    }
    Write-Host "FOUND $name method=$method comp=$comp uncomp=$uncomp local=$localOff"
  }
  $pos += 46 + $nameLen + $extraLen + $commentLen
}

if (-not ($files | Where-Object { $_.Name -eq 'android_source.zip' })) {
  throw 'android_source.zip not listed in TPZ'
}

function Save-ZipEntry($meta) {
  $out = Join-Path $Dest $meta.Name
  if ((Test-Path $out) -and ((Get-Item $out).Length -eq $meta.Uncomp)) {
    Write-Host "SKIP $($meta.Name)"
    return
  }
  $url = Resolve-Asset
  $hdr = Join-Path $Work "$($meta.Name).hdr"
  Get-RangeBytes $url $meta.Local ($meta.Local + 29) $hdr | Out-Null
  $h = [System.IO.File]::ReadAllBytes($hdr)
  if ((Read-U32 $h 0) -ne 0x04034B50) { throw "bad local header $($meta.Name)" }
  $fnLen = Read-U16 $h 26
  $exLen = Read-U16 $h 28
  $dataStart = $meta.Local + 30 + $fnLen + $exLen
  $dataEnd = $dataStart + $meta.Comp - 1
  $payload = Join-Path $Work $meta.Name
  if ($meta.Comp -eq 0) {
    Set-Content -Path $payload -Value $null -Encoding Byte
  } else {
    Get-RangeBytes $url $dataStart $dataEnd $payload | Out-Null
  }
  if ($meta.Method -eq 0) {
    Copy-Item $payload $out -Force
  } elseif ($meta.Method -eq 8) {
    $input = [System.IO.File]::OpenRead($payload)
    try {
      $deflate = New-Object System.IO.Compression.DeflateStream($input, [System.IO.Compression.CompressionMode]::Decompress)
      $destFs = [System.IO.File]::Create($out)
      try { $deflate.CopyTo($destFs) } finally { $destFs.Dispose(); $deflate.Dispose() }
    } finally { $input.Dispose() }
  } else {
    throw "unsupported zip method $($meta.Method) for $($meta.Name)"
  }
  $got = (Get-Item $out).Length
  if ($got -ne $meta.Uncomp) { throw "$($meta.Name) size $got != $($meta.Uncomp)" }
  Write-Host "OK $($meta.Name) $got"
}

# Gradle AAB needs android_source.zip + version.txt. APKs are fallback, fetch after source.
foreach ($f in ($files | Where-Object { $_.Name -in @('android_source.zip', 'version.txt') })) {
  Save-ZipEntry $f
}
if (-not (Test-Path (Join-Path $Dest 'version.txt'))) {
  Set-Content -Path (Join-Path $Dest 'version.txt') -Value '4.4.stable' -NoNewline
}

Write-Host "Android templates -> $Dest"
Get-ChildItem $Dest | Select-Object Name, Length | Format-Table -AutoSize
