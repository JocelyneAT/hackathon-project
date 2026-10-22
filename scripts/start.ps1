[CmdletBinding()]
param(
    [switch]$InstallDependencies,
    [ValidateRange(1024, 65535)][int]$BackendPort = 8000,
    [ValidateRange(1024, 65535)][int]$FrontendPort = 3000
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskPython = Join-Path $taskRoot '.venv\Scripts\python.exe'
$taskFrontend = Join-Path $taskRoot 'frontend'
$taskNextCli = Join-Path $taskFrontend 'node_modules\next\dist\bin\next'
$taskLogDirectory = Join-Path $taskRoot '.local\logs'
$taskProcesses = @()

Push-Location -LiteralPath $taskRoot
try {
    if ($InstallDependencies) {
        if (-not (Test-Path -LiteralPath $taskPython)) {
            & python -m venv .venv
            if ($LASTEXITCODE -ne 0) { throw 'Could not create .venv. Install Python 3.12 or newer.' }
        }
        & $taskPython -c "import importlib.util, sys; sys.exit(importlib.util.find_spec('pip') is None)"
        if ($LASTEXITCODE -ne 0) {
            & $taskPython -m ensurepip --upgrade
            if ($LASTEXITCODE -ne 0) { throw 'Could not bootstrap pip in .venv.' }
        }
        & $taskPython -m pip install -r backend/requirements.txt
        if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
        & npm.cmd --prefix frontend ci
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
    }
    if (-not (Test-Path -LiteralPath $taskPython)) {
        throw 'Missing .venv. Run scripts/start.ps1 -InstallDependencies first.'
    }
    if (-not (Test-Path -LiteralPath $taskNextCli)) {
        throw 'Missing frontend dependencies. Run scripts/start.ps1 -InstallDependencies first.'
    }
    if ($BackendPort -eq $FrontendPort) { throw 'Frontend and backend require different ports.' }
    foreach ($taskPort in @($BackendPort, $FrontendPort)) {
        if (Get-NetTCPConnection -LocalPort $taskPort -State Listen -ErrorAction SilentlyContinue) {
            throw "Port $taskPort is in use. Stop the existing server or choose another port."
        }
    }
    New-Item -ItemType Directory -Path $taskLogDirectory -Force | Out-Null
    $taskBackendArguments = @('-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', "$BackendPort")
    if (Test-Path -LiteralPath (Join-Path $taskRoot '.env')) { $taskBackendArguments += @('--env-file', '.env') }
    $taskBackendProcess = Start-Process -FilePath $taskPython -ArgumentList $taskBackendArguments -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskLogDirectory 'backend.log') -RedirectStandardError (Join-Path $taskLogDirectory 'backend-error.log')
    $taskProcesses += $taskBackendProcess
    $taskHealthy = $false
    for ($taskAttempt = 0; $taskAttempt -lt 60; $taskAttempt++) {
        if ($taskBackendProcess.HasExited) { throw 'Backend stopped. Read .local/logs/backend-error.log.' }
        try {
            $taskHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 2
            if ($taskHealth.status -eq 'healthy' -and $taskHealth.database.status -eq 'connected') { $taskHealthy = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $taskHealthy) { throw 'Backend did not become healthy. Read .local/logs/backend-error.log.' }
    $taskPriorBackendUrl = $env:BACKEND_URL
    $env:BACKEND_URL = "http://127.0.0.1:$BackendPort"
    try {
        $taskNode = (Get-Command node.exe -ErrorAction Stop).Source
        $taskFrontendArguments = @(('"' + $taskNextCli + '"'), 'dev', '--hostname', '127.0.0.1', '--port', "$FrontendPort")
        $taskFrontendProcess = Start-Process -FilePath $taskNode -ArgumentList $taskFrontendArguments -WorkingDirectory $taskFrontend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskLogDirectory 'frontend.log') -RedirectStandardError (Join-Path $taskLogDirectory 'frontend-error.log')
        $taskProcesses += $taskFrontendProcess
    } finally { $env:BACKEND_URL = $taskPriorBackendUrl }
    Write-Host "SHIFT//OS: http://127.0.0.1:$FrontendPort"
    Write-Host "API documentation: http://127.0.0.1:$BackendPort/docs"
    Write-Host 'The first page can take a moment to compile. Logs are in .local/logs.'
    Write-Host 'Press Ctrl+C to stop both servers.'
    while (-not $taskBackendProcess.HasExited -and -not $taskFrontendProcess.HasExited) { Start-Sleep -Seconds 1 }
    throw 'A server stopped. Read .local/logs for the error.'
} finally {
    foreach ($taskProcess in $taskProcesses) {
        if (-not $taskProcess.HasExited) { & taskkill.exe /PID $taskProcess.Id /T /F 2>$null | Out-Null }
    }
    Pop-Location
}
