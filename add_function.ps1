# Script para agregar la función loadMonthlyRevenue
$filePath = "D:\EDITORES_CODIGO\ROADTOPRO\sistema-gym\src\app\page.tsx"
$content = Get-Content $filePath -Raw

# Función a insertar
$functionToAdd = @"

  const loadMonthlyRevenue = async () => {
    try {
      const { data: pagos, error } = await supabase
        .from('historial_pagos')
        .select('monto, metodo_pago, created_at')
        .gte('created_at', '2025-10-01')
        .lt('created_at', '2027-01-01');

      if (error) throw error;

      const meses: MonthlyRevenue[] = [];
      const startDate = new Date(2025, 9, 1);
      const endDate = new Date(2026, 11, 31);

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const mesKey = `${year}-${String(month + 1).padStart(2, '0')}`;

        const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        meses.push({
          mes: mesKey,
          mesNombre: `${mesesNombres[month]} ${year}`,
          efectivo: 0,
          yape: 0,
          total: 0
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      if (pagos) {
        pagos.forEach(pago => {
          const fecha = new Date(pago.created_at);
          const year = fecha.getFullYear();
          const month = fecha.getMonth();
          const mesKey = `${year}-${String(month + 1).padStart(2, '0')}`;

          const mesData = meses.find(m => m.mes === mesKey);
          if (mesData) {
            const monto = pago.monto || 0;
            mesData.total += monto;

            if (pago.metodo_pago === 'efectivo') {
              mesData.efectivo += monto;
            } else if (pago.metodo_pago === 'yape') {
              mesData.yape += monto;
            }
          }
        });
      }

      meses.sort((a, b) => b.mes.localeCompare(a.mes));
      setMonthlyRevenue(meses);
    } catch (error) {
      console.error('Error al cargar ingresos mensuales:', error);
    }
  };
"@

# Insertar la función después de loadExpiringMembers (después de la línea 155: };)
$pattern = "(\s+}\s+catch \(error\) \{\s+console\.error\('Error al cargar socios próximos a vencer:', error\);\s+}\s+};)"
$replacement = "`$1$functionToAdd"
$newContent = $content -replace $pattern, $replacement

# Agregar la llamada en loadStats
$pattern2 = "(// Cargar socios próximos a vencer\s+await loadExpiringMembers\(\);)"
$replacement2 = "`$1`r`n      await loadMonthlyRevenue();"
$newContent = $newContent -replace $pattern2, $replacement2

Set-Content $filePath -Value $newContent -NoNewline
Write-Host "Función agregada exitosamente"
