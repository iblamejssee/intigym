# Script para agregar la sección de ingresos mensuales
$filePath = "D:\EDITORES_CODIGO\ROADTOPRO\sistema-gym\src\app\page.tsx"
$content = Get-Content $filePath -Raw

# Sección HTML a insertar
$monthlySection = @"

          {/* Ingresos Mensuales */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#AB8745] to-[#D4A865] rounded-xl flex items-center justify-center shadow-lg shadow-[#AB8745]/30">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Ingresos por Mes</h3>
                <p className="text-sm text-gray-400">Octubre 2025 - Diciembre 2026</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyRevenue.map((mes) => {
                const porcentajeEfectivo = mes.total > 0 ? (mes.efectivo / mes.total) * 100 : 0;
                const porcentajeYape = mes.total > 0 ? (mes.yape / mes.total) * 100 : 0;

                return (
                  <div
                    key={mes.mes}
                    className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-5 shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-bold text-lg">{mes.mesNombre}</h4>
                      <div className="text-2xl font-bold text-[#D4A865]">
                        S/ {mes.total.toLocaleString()}
                      </div>
                    </div>

                    {mes.total > 0 ? (
                      <>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                Efectivo
                              </span>
                              <span className="text-sm font-semibold text-green-400">
                                S/ {mes.efectivo.toLocaleString()} ({porcentajeEfectivo.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-700/50 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${porcentajeEfectivo}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                                Yape
                              </span>
                              <span className="text-sm font-semibold text-purple-400">
                                S/ {mes.yape.toLocaleString()} ({porcentajeYape.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-700/50 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${porcentajeYape}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">Sin ingresos registrados</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
"@

# Insertar antes de "Resumen Rápido"
$pattern = "(\s+{/\* Resumen Rápido \*/})"
$replacement = "$monthlySection`r`n`$1"
$newContent = $content -replace $pattern, $replacement

Set-Content $filePath -Value $newContent -NoNewline
Write-Host "Sección de ingresos mensuales agregada exitosamente"
