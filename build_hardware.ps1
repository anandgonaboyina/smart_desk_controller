$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ">>> COMPILING ESP32-S3 FIRMWARE (LIVE STREAM) <<<" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$firmwareDir = "D:\Organized files\webDev files\deployed Websites\smart_desk_controller\smartdesk-v2\firmware\smartdesk"
$buildDir = "$firmwareDir\build"
$objDir = "$firmwareDir\obj"
$cliPath = "C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"

Write-Host "Starting compiler (First run takes 1-3 minutes to build cache)...`n" -ForegroundColor Yellow

# Build arguments array
$arguments = @(
    "compile",
    "--fqbn", "esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi",
    "--build-path", $objDir,
    "--output-dir", $buildDir,
    $firmwareDir
)

# Run arduino-cli with direct inherited output so you can see every error/warning live
& $cliPath @arguments
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Host "`n[X] Firmware compilation failed with exit code $exitCode." -ForegroundColor Red
    Pause
    exit $exitCode
}

Write-Host "`n[+] Compilation finished successfully!" -ForegroundColor Green

Write-Host "`n>>> BRIDGING COMPILED BINARY TO PWA PUBLIC FOLDER <<<" -ForegroundColor Green

$sourcePath = "$buildDir\smartdesk.ino.bin"
if (-not (Test-Path $sourcePath)) {
    $sourcePath = "$buildDir\esp32.esp32.esp32s3\smartdesk.ino.bin"
}

if (-not (Test-Path $sourcePath)) {
    Write-Host "[X] Error: Could not locate compiled .bin file at $sourcePath" -ForegroundColor Red
    Pause
    exit 1
}

$destPath = "D:\Organized files\webDev files\deployed Websites\smart_desk_controller\smartdesk-v2\pwa\public\smartdesk_latest.bin"
$destDir = Split-Path -Parent $destPath
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

Copy-Item -Path $sourcePath -Destination $destPath -Force

$binSize = (Get-Item $destPath).Length
Write-Host "SUCCESS: Placed binary into $destPath ($([math]::Round($binSize/1024, 1)) KB)" -ForegroundColor Green
Write-Host ">>> Zero-Install Web Flasher binary is live and ready! <<<" -ForegroundColor Cyan
Pause