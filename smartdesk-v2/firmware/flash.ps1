# ==============================================================================
# flash.ps1 - Instant Flash & Persistent Live Serial Monitor Suite
# ==============================================================================
param (
    [string]$Port = "COM3"
)

$ErrorActionPreference = "Stop"

function Exit-Script {
    param ([int]$ExitCode = 0)
    Write-Host ""
    Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "Press any key to close this window..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit $ExitCode
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   SmartDesk V2 - Instant Flash & Live Serial Suite     " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify COM port availability
$availablePorts = [System.IO.Ports.SerialPort]::GetPortNames()
if ($availablePorts -notcontains $Port) {
    Write-Host "[ERROR] Target port '$Port' is not connected to this PC." -ForegroundColor Red
    Write-Host "Available ports: $($availablePorts -join ', ')`n" -ForegroundColor Yellow
    Exit-Script 1
}

Write-Host "[OK] $Port detected." -ForegroundColor Green

# Test opening port to ensure it is not locked
try {
    $testPort = [System.IO.Ports.SerialPort]::new($Port, 115200)
    $testPort.Open()
    $testPort.Close()
    $testPort.Dispose()
    Write-Host "[OK] $Port is free and accessible." -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "[ERROR] $Port is currently locked by another application!" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Hint: Please close any open Arduino IDE Serial Monitors, VS Code terminals, or other apps using $Port." -ForegroundColor Yellow
    Write-Host ""
    Exit-Script 1
}

# 2. Locate Compiler / CLI
$cliPaths = @(
    "C:\Program Files\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe",
    "C:\Users\G. Anand Kumar\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe",
    "C:\Users\Anand Kumar\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
)
$arduinoCli = $null
foreach ($p in $cliPaths) {
    if (Test-Path $p) {
        $arduinoCli = $p
        break
    }
}
if (-not $arduinoCli) {
    $cliCmd = Get-Command "arduino-cli" -ErrorAction SilentlyContinue
    if ($cliCmd) { $arduinoCli = $cliCmd.Source }
}

if (-not $arduinoCli) {
    Write-Host "[ERROR] Could not find arduino-cli executable." -ForegroundColor Red
    Exit-Script 1
}

$baseDir = $PSScriptRoot
$sketchDir = Join-Path $baseDir "smartdesk"
$inputDir = Join-Path $sketchDir "build\esp32.esp32.esp32s3"
$fqbn = "esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,PSRAM=opi"

# 3. Direct Upload using pre-compiled binaries (Instant!)
Write-Host ""
Write-Host "[STEP 1/2] Instantly uploading pre-compiled binary to ESP32-S3 on $Port..." -ForegroundColor Cyan
& $arduinoCli upload -p $Port --fqbn $fqbn --input-dir $inputDir $sketchDir
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] Upload failed with exit code $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Hint: Hold BOOT button, tap RST button on ESP32-S3, then re-run flash.ps1.`n" -ForegroundColor Yellow
    Exit-Script $LASTEXITCODE
}
Write-Host "[OK] Firmware uploaded successfully!" -ForegroundColor Green

# 4. Persistent Live Serial Monitor Stream
Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host " [STEP 2/2] Opening Live Serial Monitor on $Port (115200)" -ForegroundColor Cyan
Write-Host " Press [Ctrl + C] at any time to exit the serial monitor." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$serialPort = $null

try {
    Start-Sleep -Milliseconds 500
    $serialPort = [System.IO.Ports.SerialPort]::new($Port, 115200)
    $serialPort.ReadTimeout = 500
    $serialPort.Open()

    # Trigger a clean hardware reset pulse so the board boots right in front of you
    $serialPort.DtrEnable = $false
    $serialPort.RtsEnable = $true
    Start-Sleep -Milliseconds 100
    $serialPort.RtsEnable = $false

    while ($true) {
        try {
            $line = $serialPort.ReadLine()
            if ($line) {
                $trimmed = $line.Trim()
                # Highlight build markers if found
                if ($trimmed -match "TAG=V2-") {
                    Write-Host "  [ESP32] $trimmed" -ForegroundColor Green
                } else {
                    Write-Host "  [ESP32] $trimmed" -ForegroundColor Gray
                }
            }
        } catch [System.TimeoutException] {
            # Loop continues silently on timeout to allow continuous reading
        }
    }
} catch {
    Write-Host ""
    Write-Host "[INFO] Serial monitor session ended." -ForegroundColor Yellow
} finally {
    if ($serialPort -ne $null) {
        if ($serialPort.IsOpen) {
            $serialPort.Close()
        }
        $serialPort.Dispose()
    }
}

Pause
Exit-Script 0