<#
.SYNOPSIS
    build-all.ps1 — End-to-end verification and build script for SmartDesk.
.DESCRIPTION
    Runs the pure algorithmic unit test suite, builds the Next.js PWA static export,
    and checks environment readiness for the ESP32-S3 firmware toolchain.
#>

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
}

function Run-PureTests {
    Write-Step "Step 1: Running Pure Algorithm Unit Tests"
    Push-Location -Path "$PSScriptRoot/../pwa"
    try {
        npm run check:pure
        if ($LASTEXITCODE -ne 0) {
            throw "Pure tests failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

function Build-Pwa {
    Write-Step "Step 2: Building Next.js 14 Static Export"
    Push-Location -Path "$PSScriptRoot/../pwa"
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Next.js build failed with exit code $LASTEXITCODE"
        }
        Write-Host "`n[SUCCESS] Static HTML/CSS/JS export generated in pwa/out/" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

function Check-FirmwareToolchain {
    Write-Step "Step 3: Checking Firmware Toolchain Readiness"
    $pioCmd = Get-Command pio -ErrorAction SilentlyContinue
    if ($pioCmd) {
        Write-Host "[OK] PlatformIO CLI found at $($pioCmd.Source)" -ForegroundColor Green
        Write-Host "To build ESP32-S3 firmware, run: pio run -d firmware" -ForegroundColor Yellow
    } else {
        Write-Host "[INFO] PlatformIO CLI not detected in PATH." -ForegroundColor Yellow
        Write-Host "Use VS Code with the PlatformIO extension to build and flash." -ForegroundColor Yellow
    }
}

try {
    Run-PureTests
    Build-Pwa
    Check-FirmwareToolchain
    Write-Host "`nAll verification steps completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "`n[ERROR] Build pipeline failed: $_" -ForegroundColor Red
    exit 1
}
