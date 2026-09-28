# Portable Godot 4.4 + Android SDK for MEDdonish AAB. Binaries stay outside git.
$ErrorActionPreference = 'Stop'
$Tools = $env:MEDDONISH_NATIVE_TOOLS
if (-not $Tools) { $Tools = Join-Path $env:USERPROFILE 'tools\meddonish-native' }
New-Item -ItemType Directory -Force -Path $Tools | Out-Null

function Get-CurlZip([string]$Url, [string]$Zip) {
  Write-Host "GET $Url"
  & curl.exe -L --retry 5 --retry-all-errors -C - --output $Zip $Url
  if ($LASTEXITCODE -ne 0) { throw "curl failed: $Url" }
}

$godotZip = Join-Path $Tools 'Godot_v4.4-stable_win64.exe.zip'
$godotDir = Join-Path $Tools 'godot-4.4'
if (-not (Test-Path (Join-Path $godotDir 'Godot_v4.4-stable_win64_console.exe'))) {
  Get-CurlZip 'https://github.com/godotengine/godot/releases/download/4.4-stable/Godot_v4.4-stable_win64.exe.zip' $godotZip
  Expand-Archive -Path $godotZip -DestinationPath $godotDir -Force
}

$sdkRoot = Join-Path $Tools 'android-sdk'
$cmdZip = Join-Path $Tools 'commandlinetools-win.zip'
$latest = Join-Path $sdkRoot 'cmdline-tools\latest'
if (-not (Test-Path (Join-Path $latest 'bin\sdkmanager.bat'))) {
  Get-CurlZip 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip' $cmdZip
  $tmp = Join-Path $sdkRoot 'cmdline-tools-tmp'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive -Path $cmdZip -DestinationPath $tmp -Force
  New-Item -ItemType Directory -Force -Path (Join-Path $sdkRoot 'cmdline-tools') | Out-Null
  $unpacked = Get-ChildItem $tmp -Directory | Select-Object -First 1
  if (Test-Path $latest) { Remove-Item $latest -Recurse -Force }
  Move-Item $unpacked.FullName $latest
}

$javaHome = $env:JAVA_HOME
if (-not $javaHome -or -not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) {
  $portable = Get-ChildItem $Tools -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'jdk-17*' } |
    Select-Object -First 1
  if ($portable) { $javaHome = $portable.FullName }
}
if (-not $javaHome -or -not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) {
  $guess = Get-ChildItem 'C:\Program Files\Microsoft' -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'jdk-17*' } |
    Select-Object -First 1
  if ($guess) { $javaHome = $guess.FullName }
}
$jdkZip = Join-Path $Tools 'microsoft-jdk-17-windows-x64.zip'
if ((-not $javaHome -or -not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) -and (Test-Path $jdkZip)) {
  Expand-Archive -Path $jdkZip -DestinationPath $Tools -Force
  $portable = Get-ChildItem $Tools -Directory | Where-Object { $_.Name -like 'jdk-17*' } | Select-Object -First 1
  if ($portable) { $javaHome = $portable.FullName }
}
if (-not $javaHome -or -not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) {
  throw 'JAVA_HOME / Microsoft JDK 17 not found. Place microsoft-jdk-17-windows-x64.zip in tools or install Microsoft.OpenJDK.17'
}
$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot

function Install-SdkZip([string]$Url, [string]$Zip, [string]$Marker, [string]$Dest) {
  if (Test-Path $Marker) { return }
  if (-not (Test-Path $Zip) -or (Get-Item $Zip).Length -lt 1MB) {
    Get-CurlZip $Url $Zip
  }
  $tmp = "$Zip.unpack"
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive -Path $Zip -DestinationPath $tmp -Force
  $inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
  New-Item -ItemType Directory -Force -Path (Split-Path $Dest) | Out-Null
  if (Test-Path $Dest) { Remove-Item $Dest -Recurse -Force }
  if ($inner) { Move-Item $inner.FullName $Dest } else { Move-Item $tmp $Dest }
}

$zips = Join-Path $Tools 'sdk-zips'
New-Item -ItemType Directory -Force -Path $zips | Out-Null
Install-SdkZip 'https://dl.google.com/android/repository/platform-tools_r37.0.1-win.zip' `
  (Join-Path $zips 'platform-tools_r37.0.1-win.zip') (Join-Path $sdkRoot 'platform-tools\adb.exe') (Join-Path $sdkRoot 'platform-tools')
Install-SdkZip 'https://dl.google.com/android/repository/build-tools_r34-windows.zip' `
  (Join-Path $zips 'build-tools_r34-windows.zip') (Join-Path $sdkRoot 'build-tools\34.0.0\d8.bat') (Join-Path $sdkRoot 'build-tools\34.0.0')
Install-SdkZip 'https://dl.google.com/android/repository/platform-34-ext7_r03.zip' `
  (Join-Path $zips 'platform-34-ext7_r03.zip') (Join-Path $sdkRoot 'platforms\android-34\android.jar') (Join-Path $sdkRoot 'platforms\android-34')
Install-SdkZip 'https://dl.google.com/android/repository/build-tools_r36_windows.zip' `
  (Join-Path $zips 'build-tools_r36_windows.zip') (Join-Path $sdkRoot 'build-tools\36.0.0\d8.bat') (Join-Path $sdkRoot 'build-tools\36.0.0')
Install-SdkZip 'https://dl.google.com/android/repository/platform-36_r02.zip' `
  (Join-Path $zips 'platform-36_r02.zip') (Join-Path $sdkRoot 'platforms\android-36\android.jar') (Join-Path $sdkRoot 'platforms\android-36')

& (Join-Path $PSScriptRoot 'fetch-android-templates.ps1')

Write-Host "OK tools=$Tools"
Write-Host "OK java=$javaHome"
Write-Host "OK sdk=$sdkRoot"
Write-Host "Next: pwsh scripts/export-android-aab.ps1"
