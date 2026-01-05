# Script para corregir page.tsx
$filePath = "D:\EDITORES_CODIGO\ROADTOPRO\sistema-gym\src\app\page.tsx"
$content = Get-Content $filePath -Raw

# Eliminar las líneas 149-217 (función mal ubicada y comentarios)
$lines = $content -split "`r?`n"
$newLines = @()

$skip = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
    $lineNum = $i + 1
    
    # Empezar a saltar desde línea 149
    if ($lineNum -eq 149 -and $lines[$i] -match "// Función para cargar ingresos mensuales") {
        $skip = $true
    }
    
    # Dejar de saltar después de "// await loadMonthlyRevenue();"
    if ($skip -and $lines[$i] -match "// await loadMonthlyRevenue\(\);") {
        $skip = $false
        continue
    }
    
    if (-not $skip) {
        $newLines += $lines[$i]
    }
}

# Unir las líneas
$newContent = $newLines -join "`r`n"

# Guardar
Set-Content $filePath -Value $newContent -NoNewline

Write-Host "Archivo corregido exitosamente"
