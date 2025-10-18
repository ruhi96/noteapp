# PowerShell script to convert Firebase service account JSON to single line
# Usage: .\convert-firebase-json.ps1 "path\to\serviceAccountKey.json"

param(
    [Parameter(Mandatory=$true)]
    [string]$JsonFilePath
)

if (-not (Test-Path $JsonFilePath)) {
    Write-Error "File not found: $JsonFilePath"
    exit 1
}

Write-Host "Converting to single line..." -ForegroundColor Yellow
$singleLine = Get-Content $JsonFilePath | ConvertFrom-Json | ConvertTo-Json -Compress

Write-Host "`nSingle-line JSON (copy everything below):" -ForegroundColor Green
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Output $singleLine
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`nCopied to clipboard!" -ForegroundColor Green
$singleLine | Set-Clipboard

