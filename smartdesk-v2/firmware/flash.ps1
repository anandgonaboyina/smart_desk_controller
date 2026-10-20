# ==============================================================================
# flash.ps1 - Compile, Flash, and Verify SmartDesk V2 Firmware on COM6
# ==============================================================================
param (
    [string]$Port = "COM6"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   SmartDesk V2 - Automated Flash and Verify Suite      " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Refuse any port except COM6
if ($Port -ne "COM6") {
    Write-Host "[SECURITY ERROR] Refusing target port '$Port'!" -ForegroundColor Red
    Write-Host "Flashing is strictly authorized to COM6 ONLY.`n" -ForegroundColor Yellow
    exit 1
}

# 2. Check COM6 exists and is not locked
$availablePorts = [System.IO.Ports.SerialPort]::GetPortNames()
if ($availablePorts -notcontains "COM6") {
    Write-Host "[ERROR] COM6 is not connected to this PC." -ForegroundColor Red
    Write-Host "Available ports: $($availablePorts -join ', ')`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] COM6 detected." -ForegroundColor Green

# Test opening port to ensure it is not locked
try {
    $testPort = [System.IO.Ports.SerialPort]::new("COM6", 115200)
    $testPort.Open()
    $testPort.Close()
    $testPort.Dispose()
    Write-Host "[OK] COM6 is free and accessible." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] COM6 is currently locked by another application!" -ForegroundColor Red
    Write-Host "Details: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Please close any open Serial Monitor or IDE connections on COM6 and try again.`n" -ForegroundColor Yellow
    exit 1
}

# 3. Locate Compiler
$arduinoCli = "C:\Users\Anand Kumar\AppData\Local\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
if (-not (Test-Path $arduinoCli)) {
    $cliCmd = Get-Command "arduino-cli" -ErrorAction SilentlyContinue
    if ($cliCmd) { $arduinoCli = $cliCmd.Source }
}

if (-not (Test-Path $arduinoCli)) {
    Write-Host "[ERROR] Could not find arduino-cli executable." -ForegroundColor Red
    exit 1
}

$sketchDir = Join-Path $PSScriptRoot "smartdesk"
$fqbn = "esp32:esp32:esp32s3:FlashSize=16M,PSRAM=opi,CDCOnBoot=default,PartitionScheme=app3M_fat9M_16MB"

Write-Host ""
Write-Host "[STEP 1/3] Compiling SmartDesk V2 Firmware..." -ForegroundColor Cyan
Write-Host "Sketch: $sketchDir" -ForegroundColor Gray
Write-Host "FQBN  : $fqbn" -ForegroundColor Gray
Write-Host ""

& $arduinoCli compile --fqbn $fqbn $sketchDir
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] Compilation failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[OK] Compilation successful!" -ForegroundColor Green

# 4. Upload to COM6
Write-Host ""
Write-Host "[STEP 2/3] Uploading binary to ESP32-S3 on COM6..." -ForegroundColor Cyan
& $arduinoCli upload -p COM6 --fqbn $fqbn $sketchDir
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[FAIL] Upload failed with exit code $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Hint: Hold BOOT button, tap RST button on ESP32-S3, then re-run flash.ps1.`n" -ForegroundColor Yellow
    exit $LASTEXITCODE
}
Write-Host "[OK] Firmware uploaded successfully!" -ForegroundColor Green

# 5. Read Serial Output & Verify BUILD Marker
Write-Host ""
Write-Host "[STEP 3/3] Opening COM6 at 115200 to capture boot banner (5s)..." -ForegroundColor Cyan

$serialPort = $null
$capturedBanner = [System.Collections.Generic.List[string]]::new()
$markerFound = $false

try {
    Start-Sleep -Milliseconds 400
    $serialPort = [System.IO.Ports.SerialPort]::new("COM6", 115200)
    $serialPort.ReadTimeout = 1000
    $serialPort.Open()

    # Hardware reset pulse: RTS=HIGH pulls EN low, DTR=LOW ensures IO0 stays HIGH for SPI flash boot
    $serialPort.DtrEnable = $false
    $serialPort.RtsEnable = $true
    Start-Sleep -Milliseconds 120
    $serialPort.RtsEnable = $false
    Start-Sleep -Milliseconds 50

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.ElapsedMilliseconds -lt 5000) {
        try {
            $line = $serialPort.ReadLine()
            if ($line) {
                $trimmed = $line.Trim()
                $capturedBanner.Add($trimmed)
                Write-Host "  [ESP32] $trimmed" -ForegroundColor Gray
                if ($trimmed -match "TAG=V2-") {
                    $markerFound = $true
                }
            }
        } catch [System.TimeoutException] {
            Start-Sleep -Milliseconds 40
        } catch {
            break
        }
    }
} finally {
    if ($serialPort -ne $null) {
        if ($serialPort.IsOpen) {
            $serialPort.Close()
        }
        $serialPort.Dispose()
    }
    Write-Host ""
    Write-Host "[OK] COM6 closed and released." -ForegroundColor Green
}

# 6. Verification Verdict
Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
if ($markerFound) {
    Write-Host ">>> VERIFICATION RESULT: [PASS]" -ForegroundColor Green
    Write-Host "The new SmartDesk V2 build marker was successfully confirmed on hardware!`n" -ForegroundColor Green
} else {
    Write-Host ">>> VERIFICATION RESULT: [FAIL]" -ForegroundColor Red
    Write-Host "The expected BUILD marker (TAG=V2-) was not detected in serial output.`n" -ForegroundColor Red
    exit 1
}

