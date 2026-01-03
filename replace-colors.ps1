# Script to replace red colors with brand colors
# Gold: #AB8745
# Dark Blue: #32556E

$files = Get-ChildItem -Path "src" -Recurse -Include *.tsx,*.ts

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Replace red colors with gold
    $content = $content -replace 'red-600', '[#AB8745]'
    $content = $content -replace 'red-700', '[#8B6935]'
    $content = $content -replace 'red-500', '[#CB9755]'
    $content = $content -replace 'red-400', '[#D4A865]'
    $content = $content -replace 'red-300', '[#E0BA85]'
    
    # Replace specific red hex colors if any
    $content = $content -replace '#ef4444', '#AB8745'
    $content = $content -replace '#dc2626', '#AB8745'
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "Color replacement complete!"
