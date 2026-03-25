$installDir = "$HOME\.opencode\bin"
$zipPath = "$env:TEMP\opencode-windows-x64.zip"
$url = "https://github.com/anomalyco/opencode/releases/latest/download/opencode-windows-x64.zip"

if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force
}

Write-Host "Downloading OpenCode from $url..."
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "Extracting OpenCode to $installDir..."
Expand-Archive -Path $zipPath -DestinationPath $installDir -Force

Write-Host "Cleaning up..."
Remove-Item $zipPath

Write-Host "OpenCode installed successfully at $installDir"
Write-Host "You can run it using: & '$installDir\opencode.exe'"
