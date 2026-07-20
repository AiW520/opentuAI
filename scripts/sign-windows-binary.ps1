param(
  [Parameter(Mandatory = $true)]
  [string]$BinaryPath
)

$ErrorActionPreference = 'Stop'

if (-not $env:WINDOWS_CERTIFICATE -or -not $env:WINDOWS_CERTIFICATE_PASSWORD) {
  throw '缺少 WINDOWS_CERTIFICATE 或 WINDOWS_CERTIFICATE_PASSWORD'
}

$certPath = Join-Path $env:RUNNER_TEMP 'opentu-signing.pfx'
if (-not (Test-Path -LiteralPath $certPath)) {
  [IO.File]::WriteAllBytes(
    $certPath,
    [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE)
  )
}

$signtool = (
  Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin" `
    -Filter signtool.exe -Recurse |
    Sort-Object FullName -Descending |
    Select-Object -First 1
).FullName

if (-not $signtool) {
  throw '未找到 signtool.exe'
}

& $signtool sign `
  /fd SHA256 `
  /td SHA256 `
  /tr http://timestamp.digicert.com `
  /f $certPath `
  /p $env:WINDOWS_CERTIFICATE_PASSWORD `
  $BinaryPath

if ($LASTEXITCODE -ne 0) {
  throw "Windows 签名失败: $BinaryPath"
}
