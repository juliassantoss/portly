$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Resolve-CommandName {
  param(
    [string[]] $Names
  )

  foreach ($name in $Names) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) {
      return $command.Source
    }
  }

  return $null
}

function Save-NgrokAuthToken {
  param(
    [string] $Token
  )

  $legacyConfigDir = Join-Path $env:USERPROFILE ".ngrok2"
  $legacyConfigPath = Join-Path $legacyConfigDir "ngrok.yml"
  New-Item -ItemType Directory -Force -Path $legacyConfigDir | Out-Null
  Set-Content -Path $legacyConfigPath -Value "authtoken: $Token" -Encoding ascii

  $modernConfigDir = Join-Path $env:LOCALAPPDATA "ngrok"
  $modernConfigPath = Join-Path $modernConfigDir "ngrok.yml"
  New-Item -ItemType Directory -Force -Path $modernConfigDir | Out-Null

  $modernConfig = @(
    'version: "2"'
    "authtoken: $Token"
  )
  Set-Content -Path $modernConfigPath -Value $modernConfig -Encoding ascii
}

function Start-NgrokTunnel {
  param(
    [int] $Port
  )

  $arguments = @("http", "$Port", "--log=stdout")

  if ($script:ngrokCommand) {
    return Start-Process -FilePath $script:ngrokCommand -ArgumentList $arguments -PassThru -WindowStyle Hidden
  }

  return Start-Process -FilePath $script:npxCommand -ArgumentList (@("ngrok") + $arguments) -PassThru -WindowStyle Hidden
}

$script:npxCommand = Resolve-CommandName @("npx.cmd", "npx")
if (-not $script:npxCommand) {
  throw "npx was not found. Install Node.js LTS and reopen VS Code."
}

$script:ngrokCommand = Resolve-CommandName @("ngrok.exe", "ngrok.cmd", "ngrok")
$metroPort = 8081

if ($env:NGROK_AUTHTOKEN) {
  Write-Host "Saving ngrok auth token from NGROK_AUTHTOKEN..."
  Save-NgrokAuthToken -Token $env:NGROK_AUTHTOKEN
}

Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Starting ngrok tunnel for Metro on port $metroPort..."
$ngrokProcess = Start-NgrokTunnel -Port $metroPort

try {
  $publicUrl = $null

  for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
      $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
      $publicUrl = $response.tunnels |
        Where-Object { $_.proto -eq "https" -and $_.public_url } |
        Select-Object -First 1 -ExpandProperty public_url

      if ($publicUrl) {
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  if (-not $publicUrl) {
    throw "ngrok did not create a public HTTPS tunnel. If this is the first time, set NGROK_AUTHTOKEN and run this script again."
  }

  $env:EXPO_PACKAGER_PROXY_URL = $publicUrl

  Write-Host ""
  Write-Host "Tunnel ready: $publicUrl"
  Write-Host "Starting Expo with the tunnel URL injected into the QR code..."
  Write-Host ""

  & $script:npxCommand expo start --localhost -c
} finally {
  if ($ngrokProcess -and -not $ngrokProcess.HasExited) {
    Stop-Process -Id $ngrokProcess.Id -Force
  }
}
