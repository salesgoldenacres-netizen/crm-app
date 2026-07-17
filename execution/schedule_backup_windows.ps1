# Schedule daily Firestore backups on Windows Task Scheduler (small-team pragmatic path).
# Run from PowerShell in the repo (or any directory).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File execution\schedule_backup_windows.ps1
#   powershell -ExecutionPolicy Bypass -File execution\schedule_backup_windows.ps1 -Register
#   powershell -ExecutionPolicy Bypass -File execution\schedule_backup_windows.ps1 -RunNow
#
# Requires:
#   - .env with FIREBASE_SERVICE_ACCOUNT_JSON
#   - pip install -r execution/requirements.txt

param(
    [switch]$Register,
    [switch]$RunNow,
    [string]$TaskName = "GoldenAcres-FirestoreBackup",
    [string]$Time = "00:30"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

$PythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $PythonCmd) {
    $PythonCmd = Get-Command py -ErrorAction SilentlyContinue
}
if (-not $PythonCmd) {
    Write-Error "Python not found on PATH. Install Python 3 and retry."
}
$Python = $PythonCmd.Source

$BackupCmd = "`"$Python`" `"$RepoRoot\execution\backup_firestore.py`" --action backup --retain 14"

if ($RunNow) {
    Write-Host "Running backup now..."
    Push-Location $RepoRoot
    try {
        & $Python "$RepoRoot\execution\backup_firestore.py" --action backup --retain 14
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } finally {
        Pop-Location
    }
    exit 0
}

if ($Register) {
    $Action = New-ScheduledTaskAction -Execute $Python -Argument "`"$RepoRoot\execution\backup_firestore.py`" --action backup --retain 14" -WorkingDirectory $RepoRoot
    $Trigger = New-ScheduledTaskTrigger -Daily -At $Time
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -StartWhenAvailable -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
    Write-Host "Registered scheduled task '$TaskName' daily at $Time."
    Write-Host "Backups land in: $RepoRoot\backups\ (gitignored). Retention: 14 files."
    Write-Host "Optional offsite: copy backups\ to OneDrive / Google Drive, or enable .github/workflows/backup-firestore.yml with FIREBASE_SERVICE_ACCOUNT_JSON secret."
    exit 0
}

Write-Host @"
Golden Acres — Windows daily backup helper

Repo: $RepoRoot
Command: $BackupCmd

Options:
  -RunNow     Run one backup immediately
  -Register   Create/update Task Scheduler job '$TaskName' at $Time daily
  -Time       Clock time for -Register (default 00:30)

See directives/backup_firestore.md
"@
