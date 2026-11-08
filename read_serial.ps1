$portName = "COM3"
$baudRate = 115200

$port = New-Object System.IO.Ports.SerialPort($portName, $baudRate)
$port.ReadTimeout = 1000

try {
    $port.Open()
    Write-Host ">>> Triggering hardware reset (SPI Flash boot) on $portName..." -ForegroundColor Cyan
    $port.DtrEnable = $false
    $port.RtsEnable = $true
    Start-Sleep -Milliseconds 150
    $port.RtsEnable = $false
    $port.DtrEnable = $false
    Start-Sleep -Milliseconds 100
    Write-Host ">>> Monitoring boot & connection sequence for 15 seconds..." -ForegroundColor Cyan
    
    #$sw = [System.Diagnostics.Stopwatch]::StartNew()
    #while ($sw.ElapsedMilliseconds -lt 15000) {
     while($true){   
        try {
            $line = $port.ReadLine()
            if ($line) {
                Write-Host $line.Trim()
            }
        } catch [System.TimeoutException] {
            # timeout tick
        }
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    if ($port -and $port.IsOpen) {
        $port.Close()
    }
    if ($port) {
        $port.Dispose()
    }
    Write-Host ">>> Closed $portName." -ForegroundColor Cyan
}
