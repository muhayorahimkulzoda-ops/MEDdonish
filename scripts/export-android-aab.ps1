# Headless Godot Android AAB. Requires bootstrap-android-export.ps1 first.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Tools = $env:MEDDONISH_NATIVE_TOOLS
if (-not $Tools) { $Tools = Join-Path $env:USERPROFILE 'tools\meddonish-native' }
$Godot = Join-Path $Tools 'godot-4.4\Godot_v4.4-stable_win64_console.exe'
$Sdk = Join-Path $Tools 'android-sdk'
if (-not (Test-Path $Godot)) { throw "Godot missing: $Godot" }
if (-not (Test-Path (Join-Path $Sdk 'platforms\android-34\android.jar'))) { throw 'Android SDK platform 34 missing. Run scripts/bootstrap-android-export.ps1' }
$templates = Join-Path $env:APPDATA 'Godot\export_templates\4.4.stable'
if (-not (Test-Path (Join-Path $templates 'android_source.zip'))) { throw 'Godot android_source.zip missing. Run scripts/fetch-android-templates.ps1' }

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
if (-not $javaHome -or -not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) { throw 'Microsoft JDK 17 not found. Run scripts/bootstrap-android-export.ps1' }
$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk
$env:Path = "$javaHome\bin;" + $env:Path

$ksDir = Join-Path $Tools 'keystore'
New-Item -ItemType Directory -Force -Path $ksDir | Out-Null
$ks = Join-Path $ksDir 'upload.keystore'
$alias = 'upload'
$passFile = Join-Path $ksDir 'upload.pass'
if (-not (Test-Path $ks)) {
  $pass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 28 | ForEach-Object { [char]$_ })
  [System.IO.File]::WriteAllText($passFile, $pass, [System.Text.Encoding]::ASCII)
  & keytool -genkeypair -v -keystore $ks -alias $alias -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass $pass -keypass $pass `
    -dname 'CN=MEDdonish, OU=Mobile, O=MEDinstitut, L=Dushanbe, ST=Dushanbe, C=TJ'
  Write-Host "Created upload keystore (NOT in git): $ks"
}
$pass = [System.IO.File]::ReadAllText($passFile).Trim()

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$settingsDir = Join-Path $env:APPDATA 'Godot'
New-Item -ItemType Directory -Force -Path $settingsDir | Out-Null
$settings = Join-Path $settingsDir 'editor_settings-4.4.tres'
$javaEsc = ($javaHome -replace '\\', '/')
$sdkEsc = ($Sdk -replace '\\', '/')
function Set-TresKey([string]$text, [string]$key, [string]$value) {
  $line = "$key = `"$value`""
  $pattern = '(?m)^' + [regex]::Escape($key) + '\s*=\s*.*$'
  if ([regex]::IsMatch($text, $pattern)) {
    return [regex]::Replace($text, $pattern, $line.Replace('$', '$$$$'))
  }
  return $text.TrimEnd() + "`n$line`n"
}
if (Test-Path $settings) {
  $settingsText = [System.IO.File]::ReadAllText($settings)
  if ($settingsText.Length -eq 0 -or $settingsText[0] -ne '[') {
    $settingsText = "[gd_resource type=`"EditorSettings`" format=3]`n`n[resource]`n"
  }
} else {
  $settingsText = "[gd_resource type=`"EditorSettings`" format=3]`n`n[resource]`n"
}
$settingsText = Set-TresKey $settingsText 'export/android/java_sdk_path' $javaEsc
$settingsText = Set-TresKey $settingsText 'export/android/android_sdk_path' $sdkEsc
[System.IO.File]::WriteAllText($settings, $settingsText, $utf8NoBom)

$outDir = Join-Path $Root 'apps\mobile-godot\export'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$aab = Join-Path $outDir 'meddonish-release.aab'
$project = Join-Path $Root 'apps\mobile-godot'
$presets = Join-Path $project 'export_presets.cfg'
$backup = "$presets.bak-export"
Copy-Item $presets $backup -Force
try {
  $cfg = [System.IO.File]::ReadAllText($presets)
  $ksFwd = $ks -replace '\\', '/'
  $aabFwd = $aab -replace '\\', '/'
  $cfg = $cfg.Replace('keystore/release=""', "keystore/release=`"$ksFwd`"")
  $cfg = $cfg.Replace('keystore/release_user=""', "keystore/release_user=`"$alias`"")
  $cfg = $cfg.Replace('keystore/release_password=""', "keystore/release_password=`"$pass`"")
  $cfg = $cfg.Replace('export_path=""', "export_path=`"$aabFwd`"")
  if (-not (Test-Path (Join-Path $project 'addons\MEDdonish\MEDdonish.release.aar'))) {
    $cfg = $cfg.Replace('plugins/MEDdonish=true', 'plugins/MEDdonish=false')
  }
  if ($cfg[0] -ne '[') { throw 'export_presets.cfg would not start with [ - abort' }
  [System.IO.File]::WriteAllText($presets, $cfg, $utf8NoBom)
  $androidBuild = Join-Path $project 'android\build'
  $godotArgs = @('--headless', '--path', $project)
  if (-not (Test-Path (Join-Path $androidBuild 'build.gradle'))) {
    Write-Host 'Installing Android gradle build template and exporting AAB...'
    $godotArgs += '--install-android-build-template'
  } else {
    Write-Host 'Exporting Android AAB...'
  }
  $godotArgs += @('--export-release', 'Android', $aab, '--quit')
  & $Godot @godotArgs
  $godotExit = $LASTEXITCODE
  if (-not (Test-Path $aab)) { throw "Godot export failed: $godotExit" }
  if ($godotExit -ne 0) { Write-Host "Godot exited $godotExit; AAB is present." }
} finally {
  Move-Item $backup $presets -Force
}
if (-not (Test-Path $aab)) { throw "AAB was not created: $aab" }
Write-Host "AAB $aab ($((Get-Item $aab).Length) bytes)"
Write-Host "Keystore $ks - keep offline. Do not commit."
Write-Host 'Upload SHA-256 (assetlinks / Play Console):'
& keytool -list -v -keystore $ks -alias $alias -storepass $pass | Select-String -Pattern 'SHA256:'
