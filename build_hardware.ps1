$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ">>> COMPILING ESP32-S3 FIRMWARE (WITH PROGRESS) <<<" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$firmwareDir = "D:\Organized files\webDev files\deployed Websites\smart_desk_controller\smartdesk-v2\firmware\smartdesk"
$buildDir = "$firmwareDir\build"
$objDir = "$firmwareDir\obj"
$cliPath = "C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"

Write-Host "Starting compiler (First run takes 1-3 minutes to build cache)...`n" -ForegroundColor Yellow

# Configure the background compiler process
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $cliPath
$processInfo.Arguments = "compile --fqbn esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi --build-path `"$objDir`" --output-dir `"$buildDir`" `"$firmwareDir`""
$processInfo.RedirectStandardOutput = $true
$processInfo.RedirectStandardError = $true
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $processInfo
$process.Start() | Out-Null

# Animated Spinner Array
$spinner = @('-', '\', '|', '/')
$counter = 0

# Loop and update the visual spinner while the compiler runs in the background
while (-not $process.HasExited) {
    Write-Host -NoNewline "`r[$($spinner[$counter % 4])] Compiling in background... Please wait."
    $counter++
    Start-Sleep -Milliseconds 150
}

# Clear the spinner line and announce completion
Write-Host "`r[+] Compilation finished successfully!                                " -ForegroundColor Green

if ($process.ExitCode -ne 0) {
    $errorOut = $process.StandardError.ReadToEnd()
    Write-Error "`nFirmware compilation failed:`n$errorOut"
    exit $process.ExitCode
}

Write-Host "`n>>> BRIDGING COMPILED BINARY TO PWA PUBLIC FOLDER <<<" -ForegroundColor Green

$sourcePath = "$buildDir\smartdesk.ino.bin"
if (-not (Test-Path $sourcePath)) {
    $sourcePath = "$buildDir\esp32.esp32.esp32s3\smartdesk.ino.bin"
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