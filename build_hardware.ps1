# build_hardware.ps1 — Automated firmware compilation and Next.js PWA deployment pipeline

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ">>> COMPILING ESP32-S3 FIRMWARE (INCREMENTAL CACHING) <<<" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

& "C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe" compile -v --fqbn "esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi" --build-cache-path "D:\Organized files\webDev files\deployed Websites\smart_desk_controller\smartdesk-v2\firmware\smartdesk\cache" --output-dir "D:\Organized files\webDev files\deployed Websites\smart_desk_controller\smartdesk-v2\firmware\smartdesk\build" "D:\Organized files\webDev files\deployed Websites\smart_desk_controller\smartdesk-v2\firmware\smartdesk"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Firmware compilation failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "`n>>> BRIDGING COMPILED BINARY TO PWA PUBLIC FOLDER <<<" -ForegroundColor Green

$sourcePath = "D:\Organized files\webDev files\deployed Websites\smart_desk_controller\smartdesk-v2\firmware\smartdesk\build\smartdesk.ino.bin"
if (-not (Test-Path $sourcePath)) {
    $sourcePath = "D:\Organized files\webDev files\deployed Websites\smart_desk_controller\smartdesk-v2\firmware\smartdesk\build\esp32.esp32.esp32s3\smartdesk.ino.bin"
}

$destPath = "D:\Organized files\webDev files\deployed Websites\smart_desk_controller\smartdesk-v2\pwa\public\smartdesk_latest.bin"
$destDir = Split-Path -Parent $destPath
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

Copy-Item -Path $sourcePath -Destination $destPath -Force

$binSize = (Get-Item $destPath).Length
Write-Host "SUCCESS: Placed $sourcePath into $destPath ($([math]::Round($binSize/1024, 1)) KB)" -ForegroundColor Green
Write-Host ">>> Zero-Install Web Flasher binary is live and ready! <<<" -ForegroundColor Cyan
